const prisma = require('../db');

const getSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    const attendanceDateFilter = {};
    if (startDate && endDate) {
      const gte = new Date(startDate);
      const lte = new Date(endDate + 'T23:59:59.999Z');
      dateFilter.created_at = { gte, lte };
      attendanceDateFilter.logged_at = { gte, lte };
    }

    // 1. Top Books
    const topBooksRaw = await prisma.borrowRecord.groupBy({
      by: ['book_id'],
      where: dateFilter,
      _count: { book_id: true },
      orderBy: { _count: { book_id: 'desc' } },
      take: 5
    });
    
    const topBooks = [];
    for (const pb of topBooksRaw) {
      const b = await prisma.book.findUnique({ where: { id: pb.book_id } });
      if (b) topBooks.push({ title: b.title, borrows: pb._count.book_id });
    }

    // 2. Least Books
    const leastBooksRaw = await prisma.borrowRecord.groupBy({
      by: ['book_id'],
      where: dateFilter,
      _count: { book_id: true },
      orderBy: { _count: { book_id: 'asc' } },
      take: 5
    });
    
    const leastBooks = [];
    for (const lb of leastBooksRaw) {
      const b = await prisma.book.findUnique({ where: { id: lb.book_id } });
      if (b) leastBooks.push({ title: b.title, borrows: lb._count.book_id });
    }

    // 3. Popular Genres
    const allBooks = await prisma.borrowRecord.findMany({
      where: dateFilter,
      include: { book: { include: { genre: true } } }
    });
    const genreCounts = {};
    allBooks.forEach(r => {
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
      where: dateFilter,
      _count: { user_id: true },
      orderBy: { _count: { user_id: 'desc' } },
      take: 3
    });
    const topStudents = [];
    let rank = 1;
    for (const ts of topStudentsRaw) {
      const u = await prisma.user.findUnique({ 
        where: { id: ts.user_id },
        include: { program: true }
      });
      if (u) {
        topStudents.push({
          rank: rank++,
          name: `${u.first_name} ${u.last_name}`,
          student_id: u.student_id,
          program: u.program?.name || 'N/A',
          borrows: ts._count.user_id
        });
      }
    }

    // 5. Visits by Program
    const allAttendance = await prisma.attendanceLog.findMany({
      where: { action: 'CHECK_IN', ...attendanceDateFilter },
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

    // 6. Penalties & Financials
    const unpaidPenaltiesRaw = await prisma.penalty.findMany({
      where: { status: 'UNPAID', ...dateFilter },
      include: { user: true }
    });
    const penalties = unpaidPenaltiesRaw.map(p => ({
      name: `${p.user.first_name} ${p.user.last_name}`,
      amount: parseFloat(p.amount)
    }));

    const paidPenaltiesRaw = await prisma.penalty.aggregate({
      where: { status: 'PAID', ...dateFilter },
      _sum: { amount: true }
    });
    const unpaidSumRaw = await prisma.penalty.aggregate({
      where: { status: 'UNPAID', ...dateFilter },
      _sum: { amount: true }
    });

    const financials = {
      unpaidCount: unpaidPenaltiesRaw.length,
      totalUnpaid: parseFloat(unpaidSumRaw._sum.amount || 0),
      totalPaid: parseFloat(paidPenaltiesRaw._sum.amount || 0)
    };

    // 7. Overdue Records
    const overdueRaw = await prisma.borrowRecord.findMany({
      where: { status: 'OVERDUE', ...dateFilter },
      include: { user: { include: { program: true } } }
    });
    const overdue = overdueRaw.map(o => {
      const daysLate = Math.floor((new Date() - new Date(o.due_date)) / (1000 * 60 * 60 * 24));
      return {
        name: `${o.user.first_name} ${o.user.last_name}`,
        program: o.user.program?.name || 'N/A',
        daysLate: daysLate > 0 ? daysLate : 0
      };
    });

    // 8. Borrow Trend (Last 30 Days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentBorrows = await prisma.borrowRecord.findMany({
      where: { created_at: { gte: thirtyDaysAgo } },
      select: { created_at: true }
    });
    
    // Group by day string
    const dateMap = {};
    // Pre-fill last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = `${d.getMonth()+1}/${d.getDate()}`;
      dateMap[ds] = 0;
    }
    
    recentBorrows.forEach(b => {
      const ds = `${b.created_at.getMonth()+1}/${b.created_at.getDate()}`;
      if (dateMap[ds] !== undefined) dateMap[ds]++;
    });
    
    const trendAnalysis = Object.keys(dateMap).map(date => ({
      date,
      borrows: dateMap[date]
    }));

    const totalBorrowsRaw = await prisma.borrowRecord.count({ where: dateFilter });
    const totalReturnedRaw = await prisma.borrowRecord.count({ where: { status: 'RETURNED', ...dateFilter } });
    const totalVisitsRaw = await prisma.attendanceLog.count({ where: { action: 'CHECK_IN', ...attendanceDateFilter } });

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
      overdueCount: overdueRaw.length
    });

  } catch (error) {
    console.error('Error fetching reports summary:', error);
    res.status(500).json({ error: 'Server error fetching reports' });
  }
};

const getFullReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    const attendanceDateFilter = {};
    if (startDate && endDate) {
      const gte = new Date(startDate);
      const lte = new Date(endDate + 'T23:59:59.999Z');
      dateFilter.created_at = { gte, lte };
      attendanceDateFilter.logged_at = { gte, lte };
    }

    const allBorrows = await prisma.borrowRecord.findMany({
      where: dateFilter,
      include: {
        user: { select: { first_name: true, last_name: true, program: true } },
        book: { select: { title: true, isbn: true, author: true } }
      }
    });

    const allVisits = await prisma.attendanceLog.findMany({
      where: attendanceDateFilter,
      include: {
        user: { select: { first_name: true, last_name: true, program: true } }
      }
    });

    // Books inventory doesn't need date filtering usually, but can be left as is.
    const allBooks = await prisma.book.findMany({
      include: { genre: true }
    });

    const allPenalties = await prisma.penalty.findMany({
      where: dateFilter,
      include: {
        user: { select: { first_name: true, last_name: true } }
      }
    });

    res.json({ allBorrows, allVisits, allBooks, allPenalties });
  } catch (error) {
    console.error('Error fetching full report:', error);
    res.status(500).json({ error: 'Server error fetching full report' });
  }
};

module.exports = { getSummary, getFullReport };
