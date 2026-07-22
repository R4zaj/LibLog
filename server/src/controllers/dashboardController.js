const prisma = require('../db');

const getOverview = async (req, res) => {
  try {
    const totalTitles = await prisma.book.count();
    
    // Total copies logic
    const books = await prisma.book.findMany({ select: { total_copies: true } });
    const totalCopies = books.reduce((acc, book) => acc + book.total_copies, 0);

    const totalBorrowed = await prisma.borrowRecord.count({
      where: { status: 'BORROWED' }
    });

    const overdueCount = await prisma.borrowRecord.count({
      where: { status: 'OVERDUE' }
    });

    // Accurate students inside logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const logs = await prisma.attendanceLog.findMany({
      where: { logged_at: { gte: today } },
      orderBy: { logged_at: 'asc' }
    });

    const userStatus = {}; 
    logs.forEach(log => {
      if (log.action === 'CHECK_IN') userStatus[log.user_id] = 'IN';
      else if (log.action === 'CHECK_OUT') userStatus[log.user_id] = 'OUT';
    });

    const studentsInside = Object.values(userStatus).filter(status => status === 'IN').length;

    // Fetch capacity
    const settings = await prisma.librarySettings.findFirst();
    const capacity = settings ? settings.library_capacity : 40;
    const collectionTarget = settings ? settings.book_collection_target : 5000;
    const availableSlots = capacity - studentsInside;

    const unpaidCount = await prisma.penalty.count({
      where: { status: 'UNPAID' }
    });
    
    const unpaidPenalties = await prisma.penalty.findMany({
      where: { status: 'UNPAID' }
    });
    const unpaidAmount = unpaidPenalties.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);

    const logsWithDuration = await prisma.attendanceLog.findMany({
      where: { duration_minutes: { not: null } }
    });
    const avgVisitDuration = logsWithDuration.length > 0 
      ? Math.round(logsWithDuration.reduce((acc, log) => acc + log.duration_minutes, 0) / logsWithDuration.length)
      : 0;

    // Active users (Top Visitors)
    const topVisitorsRaw = await prisma.attendanceLog.groupBy({
      by: ['user_id'],
      _count: { user_id: true },
      orderBy: { _count: { user_id: 'desc' } },
      take: 3
    });
    
    const activeUsers = [];
    for (const tv of topVisitorsRaw) {
      const u = await prisma.user.findUnique({ where: { id: tv.user_id } });
      if (u) {
        activeUsers.push({ name: `${u.first_name} ${u.last_name}`, visits: tv._count.user_id });
      }
    }

    // Borrows by Program
    const allBorrows = await prisma.borrowRecord.findMany({
      include: { user: { include: { program: true } } }
    });
    
    const programCounts = {};
    allBorrows.forEach(b => {
      const progName = b.user?.program?.name || 'Unknown';
      programCounts[progName] = (programCounts[progName] || 0) + 1;
    });
    const borrowsByProgram = Object.keys(programCounts).map(k => ({ program: k, count: programCounts[k] }));

    // Popular Books (Top 5)
    const popularBooksRaw = await prisma.borrowRecord.groupBy({
      by: ['book_id'],
      _count: { book_id: true },
      orderBy: { _count: { book_id: 'desc' } },
      take: 5
    });
    
    const popularBooks = [];
    let totalPopularBorrows = 0;
    for (const pb of popularBooksRaw) {
      const b = await prisma.book.findUnique({ where: { id: pb.book_id }, include: { author: true, genre: true } });
      if (b) {
        popularBooks.push({ 
          id: b.id, 
          title: b.title, 
          author: b.author?.name || 'Unknown',
          genre: b.genre?.name || 'Unknown',
          borrows: pb._count.book_id 
        });
        totalPopularBorrows += pb._count.book_id;
      }
    }
    // Calculate percentages for donut chart
    popularBooks.forEach(pb => {
      pb.percentage = totalPopularBorrows > 0 ? Math.round((pb.borrows / totalPopularBorrows) * 100) : 0;
    });

    // Recent Activity
    const recentBorrows = await prisma.borrowRecord.findMany({
      include: { user: true, book: true },
      orderBy: { created_at: 'desc' },
      take: 5
    });
    const recentAttendance = await prisma.attendanceLog.findMany({
      include: { user: true },
      orderBy: { logged_at: 'desc' },
      take: 5
    });

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
    activities.sort((a, b) => b.date - a.date);
    const recentActivity = activities.slice(0, 5);

    res.json({
      totalTitles,
      totalCopies,
      totalBorrowed,
      overdueCount,
      studentsInside: Math.max(0, studentsInside),
      availableSlots: Math.max(0, availableSlots),
      capacity: capacity,
      collectionTarget,
      avgVisitDuration,
      unpaidAmount,
      unpaidCount,
      activeUsers,
      borrowsByProgram,
      popularBooks,
      recentActivity
    });
  } catch (error) {
    console.error('Dashboard Overview Error:', error);
    res.status(500).json({ error: 'Server error fetching dashboard stats' });
  }
};

module.exports = { getOverview };
