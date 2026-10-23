const prisma = require('../db');

const getOverview = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Run all independent queries in parallel
    const [
      totalTitles,
      booksAgg,
      totalArchived,
      totalBorrowed,
      overdueCount,
      todayLogs,
      settings,
      unpaidCount,
      unpaidAgg,
      avgDurationAgg,
      topVisitorsRaw,
      borrowsByProgramRaw,
      popularBooksRaw,
      recentBorrows,
      recentAttendance,
    ] = await Promise.all([
      prisma.book.count({ where: { is_archived: false } }),
      prisma.book.aggregate({ _sum: { total_copies: true }, where: { is_archived: false } }),
      prisma.book.count({ where: { is_archived: true } }),
      prisma.borrowRecord.count({ where: { status: 'BORROWED' } }),
      prisma.borrowRecord.count({ where: { status: 'OVERDUE' } }),
      prisma.attendanceLog.findMany({
        where: { logged_at: { gte: today } },
        orderBy: { logged_at: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              student_id: true,
              card_no: true,
              first_name: true,
              last_name: true,
              program: { select: { name: true } }
            }
          }
        }
      }),
      prisma.librarySettings.findFirst(),
      prisma.penalty.count({ where: { status: 'UNPAID' } }),
      prisma.penalty.aggregate({ _sum: { amount: true }, where: { status: 'UNPAID' } }),
      prisma.attendanceLog.aggregate({
        _avg: { duration_minutes: true },
        where: { duration_minutes: { not: null } }
      }),
      prisma.attendanceLog.groupBy({
        by: ['user_id'],
        _count: { user_id: true },
        orderBy: { _count: { user_id: 'desc' } },
        take: 3
      }),
      prisma.borrowRecord.groupBy({
        by: ['user_id'],
        _count: { user_id: true },
      }),
      prisma.borrowRecord.groupBy({
        by: ['book_id'],
        _count: { book_id: true },
        orderBy: { _count: { book_id: 'desc' } },
        take: 5
      }),
      prisma.borrowRecord.findMany({
        include: { user: { select: { first_name: true, last_name: true } }, book: { select: { title: true } } },
        orderBy: { created_at: 'desc' },
        take: 5
      }),
      prisma.attendanceLog.findMany({
        include: { user: { select: { first_name: true, last_name: true } } },
        orderBy: { logged_at: 'desc' },
        take: 5
      }),
    ]);

    // Students inside
    const userStatus = {};
    todayLogs.forEach(log => {
      userStatus[log.user_id] = {
        status: log.action === 'CHECK_IN' ? 'IN' : 'OUT',
        user: log.user,
        logged_at: log.logged_at
      };
    });
    const studentsCurrentlyInside = Object.values(userStatus)
      .filter(s => s.status === 'IN' && s.user)
      .map(s => ({
        id: s.user.id,
        name: `${s.user.first_name} ${s.user.last_name}`,
        student_id: s.user.student_id || s.user.card_no || 'Student',
        program: s.user.program?.name || 'General',
        checked_in_at: s.logged_at
      }));
    const studentsInside = studentsCurrentlyInside.length;

    const capacity = settings?.library_capacity ?? 40;
    const collectionTarget = settings?.book_collection_target ?? 5000;
    const availableSlots = capacity - studentsInside;
    const totalCopies = booksAgg._sum.total_copies || 0;
    const unpaidAmount = parseFloat(unpaidAgg._sum.amount || 0);
    const avgVisitDuration = Math.round(avgDurationAgg._avg.duration_minutes || 0);

    // Top visitors — batch fetch users
    const topUserIds = topVisitorsRaw.map(tv => tv.user_id);
    const topUsers = await prisma.user.findMany({
      where: { id: { in: topUserIds } },
      select: { id: true, first_name: true, last_name: true }
    });
    const topUsersMap = Object.fromEntries(topUsers.map(u => [u.id, u]));
    const activeUsers = topVisitorsRaw
      .map(tv => {
        const u = topUsersMap[tv.user_id];
        return u ? { name: `${u.first_name} ${u.last_name}`, visits: tv._count.user_id } : null;
      })
      .filter(Boolean);

    // Borrows by program — batch fetch users with programs
    const borrowUserIds = [...new Set(borrowsByProgramRaw.map(b => b.user_id))];
    const borrowUsers = await prisma.user.findMany({
      where: { id: { in: borrowUserIds } },
      select: { id: true, program: { select: { name: true } } }
    });
    const borrowUsersMap = Object.fromEntries(borrowUsers.map(u => [u.id, u]));
    const programCounts = {};
    borrowsByProgramRaw.forEach(b => {
      const prog = borrowUsersMap[b.user_id]?.program?.name || 'Unknown';
      programCounts[prog] = (programCounts[prog] || 0) + b._count.user_id;
    });
    const borrowsByProgram = Object.entries(programCounts).map(([program, count]) => ({ program, count }));

    // Popular books — batch fetch books
    const popularBookIds = popularBooksRaw.map(pb => pb.book_id);
    const popularBookData = await prisma.book.findMany({
      where: { id: { in: popularBookIds } },
      select: { id: true, title: true, author: { select: { name: true } }, genre: { select: { name: true } } }
    });
    const popularBookMap = Object.fromEntries(popularBookData.map(b => [b.id, b]));
    const totalPopularBorrows = popularBooksRaw.reduce((acc, pb) => acc + pb._count.book_id, 0);
    const popularBooks = popularBooksRaw
      .map(pb => {
        const b = popularBookMap[pb.book_id];
        if (!b) return null;
        return {
          id: b.id,
          title: b.title,
          author: b.author?.name || 'Unknown',
          genre: b.genre?.name || 'Unknown',
          borrows: pb._count.book_id,
          percentage: totalPopularBorrows > 0 ? Math.round((pb._count.book_id / totalPopularBorrows) * 100) : 0
        };
      })
      .filter(Boolean);

    // Recent Activity
    const activities = [];
    recentBorrows.forEach(b => {
      activities.push({
        id: `borrow-${b.id}`,
        type: 'BORROW',
        user: `${b.user.first_name} ${b.user.last_name}`,
        details: `borrowed "${b.book.title}"`,
        date: b.created_at
      });
    });
    recentAttendance.forEach(a => {
      activities.push({
        id: `att-${a.id}`,
        type: a.action,
        user: `${a.user.first_name} ${a.user.last_name}`,
        details: a.action === 'CHECK_IN' ? 'checked into the library' : 'checked out of the library',
        date: a.logged_at
      });
    });
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      totalTitles,
      totalCopies,
      totalArchived,
      totalBorrowed,
      overdueCount,
      studentsInside: Math.max(0, studentsInside),
      studentsCurrentlyInside,
      availableSlots: Math.max(0, availableSlots),
      capacity,
      collectionTarget,
      avgVisitDuration,
      unpaidAmount,
      unpaidCount,
      activeUsers,
      borrowsByProgram,
      popularBooks,
      recentActivity: activities.slice(0, 5)
    });
  } catch (error) {
    console.error('Dashboard Overview Error:', error);
    res.status(500).json({ error: 'Server error fetching dashboard stats' });
  }
};

const getFullLog = async (req, res) => {
  try {
    const [recentBorrows, recentAttendance] = await Promise.all([
      prisma.borrowRecord.findMany({
        include: { user: { select: { first_name: true, last_name: true } }, book: { select: { title: true } } },
        orderBy: { created_at: 'desc' },
        take: 50
      }),
      prisma.attendanceLog.findMany({
        include: { user: { select: { first_name: true, last_name: true } } },
        orderBy: { logged_at: 'desc' },
        take: 50
      }),
    ]);

    const activities = [];
    recentBorrows.forEach(b => {
      activities.push({
        id: `borrow-${b.id}`,
        type: 'BORROW',
        user: `${b.user.first_name} ${b.user.last_name}`,
        details: `borrowed "${b.book.title}"`,
        date: b.created_at
      });
    });
    recentAttendance.forEach(a => {
      activities.push({
        id: `att-${a.id}`,
        type: a.action,
        user: `${a.user.first_name} ${a.user.last_name}`,
        details: a.action === 'CHECK_IN' ? 'checked into the library' : 'checked out of the library',
        date: a.logged_at
      });
    });
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(activities.slice(0, 50));
  } catch (error) {
    console.error('Dashboard Full Log Error:', error);
    res.status(500).json({ error: 'Server error fetching full log' });
  }
};

module.exports = { getOverview, getFullLog };
