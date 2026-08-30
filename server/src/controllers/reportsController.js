const prisma = require('../db');

const getSummary = async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
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

    // 1. Top Books (with department filter + author)
    const topBooksRaw = await prisma.borrowRecord.groupBy({
      by: ['book_id'],
      where: { ...dateFilter, ...deptUserFilter },
      _count: { book_id: true },
      orderBy: { _count: { book_id: 'desc' } },
      take: 5
    });

    const topBookIds = topBooksRaw.map(b => b.book_id);
    const topBookDetails = await prisma.book.findMany({
      where: { id: { in: topBookIds }, is_archived: false },
      include: { author: true }
    });
    const topBookMap = Object.fromEntries(topBookDetails.map(b => [b.id, b]));
    const topBooks = topBooksRaw.map(pb => {
      const b = topBookMap[pb.book_id];
      return b ? {
        title: b.title,
        author: b.author?.name || 'Unknown',
        borrows: pb._count.book_id
      } : null;
    }).filter(Boolean);

    // 2. Least Books (with department filter + author)
    const leastBooksRaw = await prisma.borrowRecord.groupBy({
      by: ['book_id'],
      where: { ...dateFilter, ...deptUserFilter },
      _count: { book_id: true },
      orderBy: { _count: { book_id: 'asc' } },
      take: 5
    });

    const leastBookIds = leastBooksRaw.map(b => b.book_id);
    const leastBookDetails = await prisma.book.findMany({
      where: { id: { in: leastBookIds }, is_archived: false },
      include: { author: true }
    });
    const leastBookMap = Object.fromEntries(leastBookDetails.map(b => [b.id, b]));
    const leastBooks = leastBooksRaw.map(lb => {
      const b = leastBookMap[lb.book_id];
      return b ? {
        title: b.title,
        author: b.author?.name || 'Unknown',
        borrows: lb._count.book_id
      } : null;
    }).filter(Boolean);

    // 3. Popular Genres
    const allBorrows = await prisma.borrowRecord.findMany({
      where: { ...dateFilter, ...deptUserFilter, book: { is_archived: false } },
      include: { book: { include: { genre: true } } }
    });
    const genreCounts = {};
    allBorrows.forEach(r => {
      const gName = r.book?.genre?.name || 'Unknown';
      genreCounts[gName] = (genreCounts[gName] || 0) + 1;
    });
    const popularGenres = Object.keys(genreCounts)
      .map(name => ({ name, count: genreCounts[name] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 4. Top Students
    const topStudentsRaw = await prisma.borrowRecord.groupBy({
      by: ['user_id'],
      where: { ...dateFilter, ...deptUserFilter },
      _count: { user_id: true },
      orderBy: { _count: { user_id: 'desc' } },
      take: 3
    });
    const topStudentIds = topStudentsRaw.map(s => s.user_id);
    const topStudentUsers = await prisma.user.findMany({
      where: { id: { in: topStudentIds } },
      include: { program: true }
    });
    const topStudentMap = Object.fromEntries(topStudentUsers.map(u => [u.id, u]));
    const topStudents = topStudentsRaw.map((ts, i) => {
      const u = topStudentMap[ts.user_id];
      return u ? {
        rank: i + 1,
        name: `${u.first_name} ${u.last_name}`,
        student_id: u.student_id,
        program: u.program?.name || 'N/A',
        borrows: ts._count.user_id
      } : null;
    }).filter(Boolean);

    // 5. Visits by Program (department filtered)
    const allAttendance = await prisma.attendanceLog.findMany({
      where: { action: 'CHECK_IN', ...attendanceDateFilter, ...deptAttendanceFilter },
      include: { user: { include: { program: true } } }
    });
    const progCounts = {};
    allAttendance.forEach(a => {
      const pName = a.user?.program?.name || 'Faculty / Staff';
      progCounts[pName] = (progCounts[pName] || 0) + 1;
    });
    const visitsByProgram = Object.keys(progCounts)
      .map(name => ({ name, value: progCounts[name] }))
      .sort((a, b) => b.value - a.value);

    // Attendance logs for department filter (full list for the report table)
    const attendanceLogs = await prisma.attendanceLog.findMany({
      where: { ...attendanceDateFilter, ...deptAttendanceFilter },
      include: { user: { include: { program: true } } },
      orderBy: { logged_at: 'desc' },
      take: 100
    });
    const attendanceLogList = attendanceLogs.map(a => ({
      name: `${a.user.first_name} ${a.user.last_name}`,
      program: a.user.program?.name || 'N/A',
      action: a.action,
      time: a.logged_at
    }));

    // 6. Penalties & Financials
    const [unpaidPenaltiesRaw, paidPenaltiesRaw, unpaidSumRaw] = await Promise.all([
      prisma.penalty.findMany({ where: { status: 'UNPAID', ...dateFilter }, include: { user: true } }),
      prisma.penalty.aggregate({ where: { status: 'PAID', ...dateFilter }, _sum: { amount: true } }),
      prisma.penalty.aggregate({ where: { status: 'UNPAID', ...dateFilter }, _sum: { amount: true } })
    ]);
    const penalties = unpaidPenaltiesRaw.map(p => ({
      name: `${p.user.first_name} ${p.user.last_name}`,
      amount: parseFloat(p.amount)
    }));
    const financials = {
      unpaidCount: unpaidPenaltiesRaw.length,
      totalUnpaid: parseFloat(unpaidSumRaw._sum.amount || 0),
      totalPaid: parseFloat(paidPenaltiesRaw._sum.amount || 0)
    };

    // 7. Overdue Records
    const overdueRaw = await prisma.borrowRecord.findMany({
      where: { status: 'OVERDUE', ...dateFilter, ...deptUserFilter },
      include: { user: { include: { program: true } } }
    });
    const overdue = overdueRaw.map(o => {
      const daysLate = Math.floor((new Date() - new Date(o.due_date)) / (1000 * 60 * 60 * 24));
      return {
        name: `${o.user.first_name} ${o.user.last_name}`,
        student_id: o.user.student_id,
        program: o.user.program?.name || 'N/A',
        daysLate: daysLate > 0 ? daysLate : 0
      };
    });

    // 7b. Faculty with Unreturned Books
    const facultyUnreturnedRaw = await prisma.borrowRecord.findMany({
      where: {
        status: { in: ['BORROWED', 'OVERDUE'] },
        user: { role: 'FACULTY' }
      },
      include: {
        user: { include: { program: true } },
        book: true
      }
    });
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

    // 7c. Penalty Summary (all time)
    const [penaltySummaryPaid, penaltySummaryUnpaid] = await Promise.all([
      prisma.penalty.aggregate({ _sum: { amount: true }, _count: true, where: { status: 'PAID' } }),
      prisma.penalty.aggregate({ _sum: { amount: true }, _count: true, where: { status: 'UNPAID' } })
    ]);
    const penaltySummary = {
      paidCount: penaltySummaryPaid._count || 0,
      paidAmount: parseFloat(penaltySummaryPaid._sum.amount || 0),
      unpaidCount: penaltySummaryUnpaid._count || 0,
      unpaidAmount: parseFloat(penaltySummaryUnpaid._sum.amount || 0),
      totalAmount: parseFloat(penaltySummaryPaid._sum.amount || 0) + parseFloat(penaltySummaryUnpaid._sum.amount || 0)
    };

    // 8. Borrow Trend
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentBorrows = await prisma.borrowRecord.findMany({
      where: { created_at: { gte: thirtyDaysAgo }, ...deptUserFilter },
      select: { created_at: true }
    });
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

    const [totalBorrowsRaw, totalReturnedRaw, totalVisitsRaw] = await Promise.all([
      prisma.borrowRecord.count({ where: { ...dateFilter, ...deptUserFilter } }),
      prisma.borrowRecord.count({ where: { status: 'RETURNED', ...dateFilter, ...deptUserFilter } }),
      prisma.attendanceLog.count({ where: { action: 'CHECK_IN', ...attendanceDateFilter, ...deptAttendanceFilter } })
    ]);

    res.json({
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
    });

  } catch (error) {
    console.error('Error fetching reports summary:', error);
    res.status(500).json({ error: 'Server error fetching reports' });
  }
};

const getFullReport = async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    const dateFilter = {};
    const attendanceDateFilter = {};
    if (startDate && endDate) {
      const gte = new Date(startDate);
      const lte = new Date(endDate + 'T23:59:59.999Z');
      dateFilter.created_at = { gte, lte };
      attendanceDateFilter.logged_at = { gte, lte };
    }

    const deptUserFilter = department && department !== 'All'
      ? { user: { program: { name: department } } }
      : {};
    const deptAttendanceFilter = department && department !== 'All'
      ? { user: { program: { name: department } } }
      : {};

    const [allBorrows, allVisits, allBooks, allPenalties, archivedBooks] = await Promise.all([
      prisma.borrowRecord.findMany({
        where: { ...dateFilter, ...deptUserFilter },
        include: {
          user: { select: { first_name: true, last_name: true, program: { select: { name: true } } } },
          book: { select: { title: true, isbn: true, author: { select: { name: true } } } }
        }
      }),
      prisma.attendanceLog.findMany({
        where: { ...attendanceDateFilter, ...deptAttendanceFilter },
        include: {
          user: { select: { first_name: true, last_name: true, program: { select: { name: true } } } }
        }
      }),
      // Book inventory: show available/total + author
      prisma.book.findMany({
        where: { is_archived: false },
        include: {
          genre: true,
          author: true
        }
      }),
      prisma.penalty.findMany({
        where: dateFilter,
        include: { user: { select: { first_name: true, last_name: true } } }
      }),
      prisma.book.findMany({
        where: { is_archived: true },
        include: { genre: true, author: true }
      })
    ]);

    res.json({ allBorrows, allVisits, allBooks, allPenalties, archivedBooks });
  } catch (error) {
    console.error('Error fetching full report:', error);
    res.status(500).json({ error: 'Server error fetching full report' });
  }
};

module.exports = { getSummary, getFullReport };
