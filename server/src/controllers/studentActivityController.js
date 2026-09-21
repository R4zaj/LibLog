const prisma = require('../db');

// GET /api/student-activities/students
// Query parameters: search, program, status, role
const getStudentsSummary = async (req, res) => {
  try {
    const { search, program, status, role } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { student_id: { contains: search, mode: 'insensitive' } },
        { card_no: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (program && program !== 'All') {
      where.program = { name: program };
    }
    if (status && status !== 'All') {
      where.status = status;
    }
    if (role && role !== 'All') {
      where.role = role;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        student_id: true,
        card_no: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
        status: true,
        year_level: true,
        program: { select: { name: true, code: true } },
        penalty_balance: true,
        borrow_records: {
          select: { status: true }
        },
        attendance_logs: {
          select: { action: true, logged_at: true },
          orderBy: { logged_at: 'desc' }
        },
        penalties: {
          where: { status: 'UNPAID' },
          select: { amount: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const summaries = users.map(u => {
      let activeBorrows = 0;
      let returnedCount = 0;
      let overdueCount = 0;
      u.borrow_records.forEach(br => {
        if (br.status === 'BORROWED') activeBorrows++;
        else if (br.status === 'RETURNED') returnedCount++;
        else if (br.status === 'OVERDUE') {
          activeBorrows++;
          overdueCount++;
        }
      });

      const totalVisits = u.attendance_logs.filter(l => l.action === 'CHECK_IN').length;
      const lastActive = u.attendance_logs.length > 0 ? u.attendance_logs[0].logged_at : null;
      const unpaidPenalties = u.penalties.reduce((sum, p) => sum + parseFloat(p.amount), 0);

      return {
        id: u.id,
        student_id: u.student_id,
        card_no: u.card_no,
        name: `${u.first_name} ${u.last_name}`,
        email: u.email,
        role: u.role,
        status: u.status,
        year_level: u.year_level,
        program: u.program ? u.program.name : 'N/A',
        program_code: u.program ? u.program.code : 'N/A',
        totalBorrowed: u.borrow_records.length,
        activeBorrows,
        returnedCount,
        overdueCount,
        totalVisits,
        unpaidPenalties,
        lastActive
      };
    });

    res.json(summaries);
  } catch (error) {
    console.error('Error fetching students summary:', error);
    res.status(500).json({ error: 'Server error fetching student activities summary.' });
  }
};

// GET /api/student-activities/students/:id
const getStudentDossier = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        program: true,
        borrow_records: {
          include: {
            book: {
              include: { author: true, genre: true }
            }
          },
          orderBy: { borrow_date: 'desc' }
        },
        attendance_logs: {
          orderBy: { logged_at: 'desc' }
        },
        penalties: {
          where: { status: 'UNPAID' }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    let activeBorrows = 0;
    let returnedCount = 0;
    let overdueCount = 0;
    const bookFrequency = {};
    const genreFrequency = {};
    let onTimeReturns = 0;
    let totalCompleted = 0;

    user.borrow_records.forEach(br => {
      if (br.status === 'BORROWED') activeBorrows++;
      else if (br.status === 'RETURNED') {
        returnedCount++;
        totalCompleted++;
        if (br.return_date && new Date(br.return_date) <= new Date(br.due_date)) {
          onTimeReturns++;
        }
      }
      else if (br.status === 'OVERDUE') {
        activeBorrows++;
        overdueCount++;
      }

      if (br.book) {
        const bookId = br.book.id;
        if (!bookFrequency[bookId]) {
          bookFrequency[bookId] = {
            book: br.book,
            count: 0,
            last_borrowed: br.borrow_date
          };
        }
        bookFrequency[bookId].count++;
        if (new Date(br.borrow_date) > new Date(bookFrequency[bookId].last_borrowed)) {
          bookFrequency[bookId].last_borrowed = br.borrow_date;
        }

        if (br.book.genre) {
          const gName = br.book.genre.name;
          genreFrequency[gName] = (genreFrequency[gName] || 0) + 1;
        }
      }
    });

    const mostBorrowedBooks = Object.values(bookFrequency)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const totalGenres = Object.values(genreFrequency).reduce((a, b) => a + b, 0);
    const topReadingGenres = Object.entries(genreFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalGenres > 0 ? Math.round((count / totalGenres) * 100) : 0
      }));

    let totalVisits = 0;
    let totalTimeInLibrary = 0;
    
    // Calculate streak
    let streak = 0;
    const visitDates = new Set();
    
    user.attendance_logs.forEach(log => {
      if (log.action === 'CHECK_IN') {
        totalVisits++;
        const dateStr = new Date(log.logged_at).toISOString().split('T')[0];
        visitDates.add(dateStr);
      }
      if (log.action === 'CHECK_OUT' && log.duration_minutes) {
        totalTimeInLibrary += log.duration_minutes;
      }
    });

    const uniqueVisitDates = Array.from(visitDates).sort((a, b) => new Date(b) - new Date(a));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let currentDate = new Date(today);
    const formatYMD = (d) => {
      const offset = d.getTimezoneOffset();
      const local = new Date(d.getTime() - (offset*60*1000));
      return local.toISOString().split('T')[0];
    };

    if (!uniqueVisitDates.includes(formatYMD(currentDate))) {
      currentDate.setDate(currentDate.getDate() - 1);
      if (!uniqueVisitDates.includes(formatYMD(currentDate))) {
        streak = 0;
      }
    }

    if (streak !== 0 || uniqueVisitDates.includes(formatYMD(currentDate))) {
      while (uniqueVisitDates.includes(formatYMD(currentDate))) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      }
    }

    const unpaidPenalties = user.penalties.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    const returnPunctuality = totalCompleted > 0 ? Math.round((onTimeReturns / totalCompleted) * 100) : 100;

    // Timeline Builder
    const timeline = [];
    user.borrow_records.forEach(br => {
      timeline.push({
        id: `br-${br.id}-out`,
        type: 'BORROW',
        date: br.borrow_date,
        title: `Borrowed "${br.book?.title || 'Unknown'}"`,
        subtitle: `Due on ${new Date(br.due_date).toLocaleDateString()}`
      });
      if (br.return_date) {
        timeline.push({
          id: `br-${br.id}-in`,
          type: 'RETURN',
          date: br.return_date,
          title: `Returned "${br.book?.title || 'Unknown'}"`,
          subtitle: br.status === 'RETURNED' ? 'Completed read' : 'Returned'
        });
      }
    });

    user.attendance_logs.forEach(log => {
      timeline.push({
        id: `att-${log.id}`,
        type: log.action,
        date: log.logged_at,
        title: log.action === 'CHECK_IN' ? 'Visited Library' : 'Left Library',
        subtitle: log.duration_minutes ? `Duration: ${log.duration_minutes} mins` : ''
      });
    });

    user.penalties.forEach(p => {
      timeline.push({
        id: `pen-${p.id}`,
        type: 'PENALTY',
        date: p.created_at,
        title: `Penalty Assessed ($${p.amount})`,
        subtitle: p.notes || 'For overdue/lost book'
      });
      if (p.status === 'PAID' && p.paid_at) {
        timeline.push({
          id: `pen-${p.id}-paid`,
          type: 'PAYMENT',
          date: p.paid_at,
          title: `Penalty Paid ($${p.amount})`,
          subtitle: 'Payment received'
        });
      }
    });

    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      profile: {
        id: user.id,
        student_id: user.student_id,
        card_no: user.card_no,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        role: user.role,
        status: user.status,
        program: user.program ? user.program.name : 'N/A',
        program_code: user.program ? user.program.code : 'N/A',
        year_level: user.year_level,
        qr_code: user.qr_code,
        penalty_balance: user.penalty_balance,
        created_at: user.created_at
      },
      stats: {
        totalBorrowed: user.borrow_records.length,
        activeBorrows,
        returnedCount,
        overdueCount,
        totalVisits,
        totalTimeInLibrary,
        streak,
        unpaidPenalties,
        returnPunctuality
      },
      analytics: {
        mostBorrowedBooks,
        topReadingGenres
      },
      borrowHistory: user.borrow_records,
      attendanceHistory: user.attendance_logs,
      timeline
    });
  } catch (error) {
    console.error('Error fetching student dossier:', error);
    res.status(500).json({ error: 'Server error fetching student dossier.' });
  }
};

module.exports = {
  getStudentsSummary,
  getStudentDossier
};
