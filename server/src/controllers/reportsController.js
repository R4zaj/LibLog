const prisma = require('../db');

// In-memory caches with 60s TTL to make repeated queries instant (<1ms)
const summaryCache = new Map();
const fullReportCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

const getCached = (cache, key, force) => {
  if (force) return null;
  const entry = cache.get(key);
  if (entry && (Date.now() - entry.timestamp < CACHE_TTL_MS)) {
    return entry.data;
  }
  return null;
};

const setCached = (cache, key, data) => {
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
};

const getSummary = async (req, res) => {
  try {
    const { startDate, endDate, department, force } = req.query;
    const cacheKey = `${startDate || 'all'}_${endDate || 'all'}_${department || 'all'}`;

    const cachedData = getCached(summaryCache, cacheKey, force === 'true');
    if (cachedData) {
      return res.json(cachedData);
    }

    const dateFilter = {};
    const attendanceDateFilter = {};
    if (startDate && endDate) {
      const gte = new Date(startDate);
      const lte = new Date(endDate + 'T23:59:59.999Z');
      dateFilter.created_at = { gte, lte };
      attendanceDateFilter.logged_at = { gte, lte };
    }

    // Department filter — applied to user's program name
    const deptUserFilter = department && department !== 'All'
      ? { user: { program: { name: department } } }
      : {};

    const deptAttendanceFilter = department && department !== 'All'
      ? { user: { program: { name: department } } }
      : {};

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Batch 1: Execute all independent database queries in parallel
    const [
      topBooksRaw,
      leastBooksRaw,
      genreBorrows,
      topStudentsRaw,
      allAttendance,
      attendanceLogs,
      penaltiesGrouped,
      unpaidPenaltiesRaw,
      overdueRaw,
      facultyUnreturnedRaw,
      penaltySummaryGrouped,
      recentBorrows,
      borrowsByStatus,
      totalVisitsRaw
    ] = await Promise.all([
      // 1. Top Books raw
      prisma.borrowRecord.groupBy({
        by: ['book_id'],
        where: { ...dateFilter, ...deptUserFilter },
        _count: { book_id: true },
        orderBy: { _count: { book_id: 'desc' } },
        take: 5
      }),

      // 2. Least Books raw
      prisma.borrowRecord.groupBy({
        by: ['book_id'],
        where: { ...dateFilter, ...deptUserFilter },
        _count: { book_id: true },
        orderBy: { _count: { book_id: 'asc' } },
        take: 5
      }),

      // 3. Popular Genres - lightweight selective query (only genre name)
      prisma.borrowRecord.findMany({
        where: { ...dateFilter, ...deptUserFilter },
        select: { book: { select: { genre: { select: { name: true } } } } }
      }),

      // 4. Top Students raw
      prisma.borrowRecord.groupBy({
        by: ['user_id'],
        where: { ...dateFilter, ...deptUserFilter },
        _count: { user_id: true },
        orderBy: { _count: { user_id: 'desc' } },
        take: 3
      }),

      // 5. Visits by Program - lightweight selective query (only program name)
      prisma.attendanceLog.findMany({
        where: { action: 'CHECK_IN', ...attendanceDateFilter, ...deptAttendanceFilter },
        select: { user: { select: { program: { select: { name: true } } } } }
      }),

      // 6. Recent Attendance Logs (100) - selective fields only
      prisma.attendanceLog.findMany({
        where: { ...attendanceDateFilter, ...deptAttendanceFilter },
        select: {
          action: true,
          logged_at: true,
          user: { select: { first_name: true, last_name: true, program: { select: { name: true } } } }
        },
        orderBy: { logged_at: 'desc' },
        take: 100
      }),

      // 7. Penalties grouped by status for current period
      prisma.penalty.groupBy({
        by: ['status'],
        where: dateFilter,
        _sum: { amount: true },
        _count: { _all: true }
      }),

      // 8. Unpaid penalties list with selective user fields
      prisma.penalty.findMany({
        where: { status: 'UNPAID', ...dateFilter },
        select: { amount: true, user: { select: { first_name: true, last_name: true } } }
      }),

      // 9. Overdue records
      prisma.borrowRecord.findMany({
        where: { status: 'OVERDUE', ...dateFilter, ...deptUserFilter },
        select: {
          due_date: true,
          user: { select: { first_name: true, last_name: true, student_id: true, program: { select: { name: true } } } }
        }
      }),

      // 10. Faculty unreturned books
      prisma.borrowRecord.findMany({
        where: {
          status: { in: ['BORROWED', 'OVERDUE'] },
          user: { role: 'FACULTY' }
        },
        select: {
          user: { select: { id: true, first_name: true, last_name: true, student_id: true, program: { select: { name: true } } } },
          book: { select: { title: true } }
        }
      }),

      // 11. Penalty summary (all time) grouped by status
      prisma.penalty.groupBy({
        by: ['status'],
        _sum: { amount: true },
        _count: { _all: true }
      }),

      // 12. Borrow trend in last 30 days
      prisma.borrowRecord.findMany({
        where: { created_at: { gte: thirtyDaysAgo }, ...deptUserFilter },
        select: { created_at: true }
      }),

      // 13. Borrows grouped by status (consolidates totalBorrows & totalReturned)
      prisma.borrowRecord.groupBy({
        by: ['status'],
        where: { ...dateFilter, ...deptUserFilter },
        _count: { _all: true }
      }),

      // 14. Total visits count
      prisma.attendanceLog.count({
        where: { action: 'CHECK_IN', ...attendanceDateFilter, ...deptAttendanceFilter }
      })
    ]);

    // Batch 2: Consolidated metadata for top/least books and top students in ONE parallel query
    const combinedBookIds = Array.from(new Set([
      ...topBooksRaw.map(b => b.book_id),
      ...leastBooksRaw.map(b => b.book_id)
    ]));
    const topStudentIds = topStudentsRaw.map(s => s.user_id);

    const [bookDetails, studentUsers] = await Promise.all([
      combinedBookIds.length > 0 ? prisma.book.findMany({
        where: { id: { in: combinedBookIds } },
        select: { id: true, title: true, author: { select: { name: true } } }
      }) : [],
      topStudentIds.length > 0 ? prisma.user.findMany({
        where: { id: { in: topStudentIds } },
        select: { id: true, first_name: true, last_name: true, student_id: true, program: { select: { name: true } } }
      }) : []
    ]);

    const bookMap = Object.fromEntries(bookDetails.map(b => [b.id, b]));
    const studentMap = Object.fromEntries(studentUsers.map(u => [u.id, u]));

    // Format top books
    const topBooks = topBooksRaw.map(pb => {
      const b = bookMap[pb.book_id];
      return b ? {
        title: b.title,
        author: b.author?.name || 'Unknown',
        borrows: pb._count.book_id
      } : null;
    }).filter(Boolean);

    // Format least books
    const leastBooks = leastBooksRaw.map(lb => {
      const b = bookMap[lb.book_id];
      return b ? {
        title: b.title,
        author: b.author?.name || 'Unknown',
        borrows: lb._count.book_id
      } : null;
    }).filter(Boolean);

    // Format popular genres
    const genreCounts = {};
    genreBorrows.forEach(r => {
      const gName = r.book?.genre?.name || 'Unknown';
      genreCounts[gName] = (genreCounts[gName] || 0) + 1;
    });
    const popularGenres = Object.keys(genreCounts)
      .map(name => ({ name, count: genreCounts[name] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Format top students
    const topStudents = topStudentsRaw.map((ts, i) => {
      const u = studentMap[ts.user_id];
      return u ? {
        rank: i + 1,
        name: `${u.first_name} ${u.last_name}`,
        student_id: u.student_id,
        program: u.program?.name || 'N/A',
        borrows: ts._count.user_id
      } : null;
    }).filter(Boolean);

    // Format visits by program
    const progCounts = {};
    allAttendance.forEach(a => {
      const pName = a.user?.program?.name || 'Faculty / Staff';
      progCounts[pName] = (progCounts[pName] || 0) + 1;
    });
    const visitsByProgram = Object.keys(progCounts)
      .map(name => ({ name, value: progCounts[name] }))
      .sort((a, b) => b.value - a.value);

    // Format attendance logs
    const attendanceLogList = attendanceLogs.map(a => ({
      name: `${a.user.first_name} ${a.user.last_name}`,
      program: a.user.program?.name || 'N/A',
      action: a.action,
      time: a.logged_at
    }));

    // Penalties & Financials
    const paidEntry = penaltiesGrouped.find(p => p.status === 'PAID');
    const unpaidEntry = penaltiesGrouped.find(p => p.status === 'UNPAID');
    const penalties = unpaidPenaltiesRaw.map(p => ({
      name: `${p.user.first_name} ${p.user.last_name}`,
      amount: parseFloat(p.amount)
    }));
    const financials = {
      unpaidCount: unpaidPenaltiesRaw.length,
      totalUnpaid: parseFloat(unpaidEntry?._sum.amount || 0),
      totalPaid: parseFloat(paidEntry?._sum.amount || 0)
    };

    // Overdue records
    const overdue = overdueRaw.map(o => {
      const daysLate = Math.floor((new Date() - new Date(o.due_date)) / (1000 * 60 * 60 * 24));
      return {
        name: `${o.user.first_name} ${o.user.last_name}`,
        student_id: o.user.student_id,
        program: o.user.program?.name || 'N/A',
        daysLate: daysLate > 0 ? daysLate : 0
      };
    });

    // Faculty with unreturned books
    const facultyGrouped = {};
    facultyUnreturnedRaw.forEach(r => {
      const key = r.user.id;
      if (!facultyGrouped[key]) {
        facultyGrouped[key] = {
          name: `${r.user.first_name} ${r.user.last_name}`,
          student_id: r.user.student_id,
          program: r.user.program?.name || 'Faculty',
          bookCount: 0,
          books: []
        };
      }
      facultyGrouped[key].bookCount++;
      facultyGrouped[key].books.push(r.book?.title || 'Unknown');
    });
    const facultyUnreturned = Object.values(facultyGrouped);

    // Penalty summary (all time)
    const paidSummary = penaltySummaryGrouped.find(p => p.status === 'PAID');
    const unpaidSummary = penaltySummaryGrouped.find(p => p.status === 'UNPAID');
    const paidAmount = parseFloat(paidSummary?._sum.amount || 0);
    const unpaidAmount = parseFloat(unpaidSummary?._sum.amount || 0);
    const penaltySummary = {
      paidCount: paidSummary?._count._all || 0,
      paidAmount,
      unpaidCount: unpaidSummary?._count._all || 0,
      unpaidAmount,
      totalAmount: paidAmount + unpaidAmount
    };

    // Borrow trend in last 30 days
    const dateMap = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dateMap[`${d.getMonth()+1}/${d.getDate()}`] = 0;
    }
    recentBorrows.forEach(b => {
      const ds = `${b.created_at.getMonth()+1}/${b.created_at.getDate()}`;
      if (dateMap[ds] !== undefined) dateMap[ds]++;
    });
    const trendAnalysis = Object.keys(dateMap).map(date => ({ date, borrows: dateMap[date] }));

    // Borrows status totals
    const totalBorrowsRaw = borrowsByStatus.reduce((sum, b) => sum + b._count._all, 0);
    const totalReturnedRaw = borrowsByStatus.find(b => b.status === 'RETURNED')?._count._all || 0;

    const responseData = {
      topBooks,
      leastBooks,
      popularGenres,
      topStudents,
      visitsByProgram,
      penalties,
      overdue,
      financials,
      trendAnalysis,
      totalBorrows: totalBorrowsRaw,
      totalReturned: totalReturnedRaw,
      totalVisits: totalVisitsRaw,
      overdueCount: overdueRaw.length,
      facultyUnreturned,
      penaltySummary,
      attendanceLogList
    };

    setCached(summaryCache, cacheKey, responseData);
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching reports summary:', error);
    res.status(500).json({ error: 'Server error fetching reports' });
  }
};

const getFullReport = async (req, res) => {
  try {
    const { startDate, endDate, department, force } = req.query;
    const cacheKey = `${startDate || 'curr'}_${endDate || 'curr'}_${department || 'all'}`;

    const cachedData = getCached(fullReportCache, cacheKey, force === 'true');
    if (cachedData) {
      return res.json(cachedData);
    }

    let gte, lte;
    if (startDate && endDate) {
      gte = new Date(startDate);
      lte = new Date(endDate + 'T23:59:59.999Z');
    } else {
      const now = new Date();
      gte = new Date(now.getFullYear(), now.getMonth(), 1);
      lte = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const dateFilter = { created_at: { gte, lte } };
    const attendanceDateFilter = { logged_at: { gte, lte } };

    const durationMs = lte.getTime() - gte.getTime();
    const durationDays = Math.max(1, Math.round(durationMs / (1000 * 60 * 60 * 24)));
    const prevGte = new Date(gte.getTime() - durationMs);
    const prevLte = new Date(gte.getTime() - 1);
    const prevDateFilter = { created_at: { gte: prevGte, lte: prevLte } };
    const prevAttendanceDateFilter = { logged_at: { gte: prevGte, lte: prevLte } };

    const deptUserFilter = department && department !== 'All'
      ? { user: { program: { name: department } } }
      : {};
    const deptAttendanceFilter = department && department !== 'All'
      ? { user: { program: { name: department } } }
      : {};

    const calcChange = (curr, prev) => {
      if (prev === 0) return curr === 0 ? '0.0%' : '+100.0%';
      const pct = ((curr - prev) / prev) * 100;
      return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
    };

    const [
      allBorrows,
      allVisits,
      allBooks,
      allPenalties,
      archivedBooks,
      librarySettings,
      studentCount,
      facultyCount,
      adminCount,
      totalTitles,
      totalCopiesAgg,
      addedTitlesCount,
      addedCopiesAgg,
      archivedTitlesCount,
      archivedCopiesAgg,
      prevBorrowsCount,
      prevReturnsCount,
      prevOverdueCount,
      prevPaidPenalties,
      prevInLibraryCount,
      currInLibraryCount,
      currReturnsCount,
      currOverdueCount,
      currPaidPenalties,
      topBooksRaw
    ] = await Promise.all([
      prisma.borrowRecord.findMany({
        where: { ...dateFilter, ...deptUserFilter },
        include: {
          user: { select: { first_name: true, last_name: true, student_id: true, program: { select: { name: true } } } },
          book: { select: { title: true, isbn: true, author: { select: { name: true } }, genre: { select: { name: true } } } }
        },
        orderBy: { created_at: 'desc' }
      }),
      prisma.attendanceLog.findMany({
        where: { ...attendanceDateFilter, ...deptAttendanceFilter },
        include: {
          user: { select: { first_name: true, last_name: true, student_id: true, program: { select: { name: true } } } }
        },
        orderBy: { logged_at: 'asc' }
      }),
      prisma.book.findMany({
        where: { is_archived: false },
        include: {
          genre: true,
          author: true
        },
        orderBy: { title: 'asc' }
      }),
      prisma.penalty.findMany({
        where: dateFilter,
        include: {
          user: { select: { first_name: true, last_name: true, student_id: true, program: { select: { name: true } } } },
          borrow: { include: { book: { select: { title: true } } } }
        },
        orderBy: { created_at: 'desc' }
      }),
      prisma.book.findMany({
        where: { is_archived: true },
        include: { genre: true, author: true },
        orderBy: { updated_at: 'desc' }
      }),
      prisma.librarySettings.findFirst().catch(() => null),
      prisma.user.count({ where: { role: 'STUDENT', status: 'ACTIVE' } }).catch(() => 0),
      prisma.user.count({ where: { role: 'FACULTY', status: 'ACTIVE' } }).catch(() => 0),
      prisma.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } }).catch(() => 0),
      prisma.book.count({ where: { is_archived: false } }).catch(() => 0),
      prisma.book.aggregate({ where: { is_archived: false }, _sum: { total_copies: true } }).catch(() => ({ _sum: { total_copies: 0 } })),
      prisma.book.count({ where: { is_archived: false, created_at: dateFilter.created_at } }).catch(() => 0),
      prisma.book.aggregate({ where: { is_archived: false, created_at: dateFilter.created_at }, _sum: { total_copies: true } }).catch(() => ({ _sum: { total_copies: 0 } })),
      prisma.book.count({ where: { is_archived: true, updated_at: dateFilter.created_at } }).catch(() => 0),
      prisma.book.aggregate({ where: { is_archived: true, updated_at: dateFilter.created_at }, _sum: { total_copies: true } }).catch(() => ({ _sum: { total_copies: 0 } })),
      prisma.borrowRecord.count({ where: { ...prevDateFilter, ...deptUserFilter } }).catch(() => 0),
      prisma.borrowRecord.count({ where: { status: 'RETURNED', ...prevDateFilter, ...deptUserFilter } }).catch(() => 0),
      prisma.borrowRecord.count({ where: { status: 'OVERDUE', ...prevDateFilter, ...deptUserFilter } }).catch(() => 0),
      prisma.penalty.aggregate({ where: { status: 'PAID', ...prevDateFilter }, _sum: { amount: true } }).catch(() => ({ _sum: { amount: 0 } })),
      prisma.borrowRecord.count({ where: { type: 'READ_IN_LIBRARY', ...prevDateFilter, ...deptUserFilter } }).catch(() => 0),
      prisma.borrowRecord.count({ where: { type: 'READ_IN_LIBRARY', ...dateFilter, ...deptUserFilter } }).catch(() => 0),
      prisma.borrowRecord.count({ where: { status: 'RETURNED', ...dateFilter, ...deptUserFilter } }).catch(() => 0),
      prisma.borrowRecord.count({ where: { status: 'OVERDUE', ...dateFilter, ...deptUserFilter } }).catch(() => 0),
      prisma.penalty.aggregate({ where: { status: 'PAID', ...dateFilter }, _sum: { amount: true } }).catch(() => ({ _sum: { amount: 0 } })),
      prisma.borrowRecord.groupBy({
        by: ['book_id'],
        where: { ...dateFilter, ...deptUserFilter },
        _count: { book_id: true },
        orderBy: { _count: { book_id: 'desc' } },
        take: 10
      }).catch(() => [])
    ]);

    // Fetch details for top borrowed books
    const topBookIds = topBooksRaw.map(b => b.book_id);
    const topBookDetails = topBookIds.length > 0 ? await prisma.book.findMany({
      where: { id: { in: topBookIds } },
      include: { author: true, genre: true }
    }) : [];
    const topBookMap = Object.fromEntries(topBookDetails.map(b => [b.id, b]));
    const topBorrowedTitles = topBooksRaw.map((item, idx) => {
      const b = topBookMap[item.book_id];
      return {
        rank: idx + 1,
        title: b?.title || 'Unknown Title',
        author: b?.author?.name || 'Unknown Author',
        department: b?.genre?.name || 'General',
        borrows: item._count.book_id
      };
    });

    // Attendance stats by Program & Peak times
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const hourCounts = {};
    const programVisits = {};

    allVisits.forEach(v => {
      const d = new Date(v.logged_at || v.created_at);
      const day = d.getDay();
      const hr = d.getHours();
      dayCounts[day] = (dayCounts[day] || 0) + 1;
      hourCounts[hr] = (hourCounts[hr] || 0) + 1;

      const pName = v.user?.program?.name || (v.user?.role === 'FACULTY' ? 'Faculty & Staff' : 'General / Other');
      if (!programVisits[pName]) {
        programVisits[pName] = { program: pName, totalVisits: 0, uniqueUsers: new Set() };
      }
      programVisits[pName].totalVisits++;
      if (v.user_id) programVisits[pName].uniqueUsers.add(v.user_id);
    });

    const sortedDays = Object.entries(dayCounts).sort((a, b) => b[1] - a[1]);
    const peakDay1 = dayNames[sortedDays[0][0]];
    const peakDay2 = dayNames[sortedDays[1][0]];
    const peakDaysStr = sortedDays[0][1] > 0 ? `${peakDay1} & ${peakDay2}` : 'Monday – Friday';

    const sortedHours = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]);
    const topHour = sortedHours.length > 0 && sortedHours[0][1] > 0 ? parseInt(sortedHours[0][0]) : 10;
    const formatHour = (h) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:00 ${ampm}`;
    };
    const peakHoursStr = `${formatHour(topHour)} – ${formatHour((topHour + 2) % 24)}`;

    const attendanceByProgram = Object.values(programVisits).map(p => ({
      program: p.program,
      totalVisits: p.totalVisits,
      uniqueUsers: p.uniqueUsers.size,
      avgPerDay: (p.totalVisits / durationDays).toFixed(1)
    })).sort((a, b) => b.totalVisits - a.totalVisits);

    const responseData = {
      allBorrows,
      allVisits,
      allBooks,
      allPenalties,
      archivedBooks,
      libraryProfile: {
        hours: 'Monday – Saturday, 7:00 AM – 9:00 PM',
        seatingCapacity: librarySettings?.library_capacity || 40,
        staffCount: (adminCount || 1) + 2,
        registeredUsers: {
          students: studentCount,
          faculty: facultyCount,
          staff: adminCount,
          total: studentCount + facultyCount + adminCount
        },
        facilities: 'Circulation Desk, Barcode/QR Scanners, OPAC Stations, Reading & Study Area, Digital Records'
      },
      collectionStats: {
        printBooks: {
          totalTitles,
          totalCopies: totalCopiesAgg?._sum?.total_copies || totalTitles,
          addedTitles: addedTitlesCount,
          addedCopies: addedCopiesAgg?._sum?.total_copies || addedTitlesCount,
          withdrawnTitles: archivedTitlesCount,
          withdrawnCopies: archivedCopiesAgg?._sum?.total_copies || archivedTitlesCount
        }
      },
      circulationMetrics: {
        borrowed: {
          current: allBorrows.length,
          previous: prevBorrowsCount,
          change: calcChange(allBorrows.length, prevBorrowsCount)
        },
        returned: {
          current: currReturnsCount,
          previous: prevReturnsCount,
          change: calcChange(currReturnsCount, prevReturnsCount)
        },
        renewals: {
          current: 0,
          previous: 0,
          change: '0.0%'
        },
        overdue: {
          current: currOverdueCount,
          previous: prevOverdueCount,
          change: calcChange(currOverdueCount, prevOverdueCount)
        },
        fines: {
          current: parseFloat(currPaidPenalties?._sum?.amount || 0),
          previous: parseFloat(prevPaidPenalties?._sum?.amount || 0),
          change: calcChange(parseFloat(currPaidPenalties?._sum?.amount || 0), parseFloat(prevPaidPenalties?._sum?.amount || 0))
        },
        inLibrary: {
          current: currInLibraryCount,
          previous: prevInLibraryCount,
          change: calcChange(currInLibraryCount, prevInLibraryCount)
        },
        topBorrowedTitles
      },
      attendanceStats: {
        byProgram: attendanceByProgram,
        peakDays: peakDaysStr,
        peakHours: peakHoursStr,
        totalVisits: allVisits.length
      }
    };

    setCached(fullReportCache, cacheKey, responseData);
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching full report:', error);
    res.status(500).json({ error: 'Server error fetching full report' });
  }
};

module.exports = { getSummary, getFullReport };
