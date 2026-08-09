const prisma = require('../db');

// GET /api/settings/stats
const getStats = async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeToday = await prisma.attendanceLog.count({
      where: {
        logged_at: { gte: today },
        action: 'CHECK_IN'
      }
    });

    const penaltiesResult = await prisma.penalty.aggregate({
      _sum: { amount: true }
    });
    const totalPenalties = parseFloat(penaltiesResult._sum.amount || 0);

    const activeAnnouncements = await prisma.announcement.count({
      where: { is_active: true }
    });

    const settings = await prisma.librarySettings.findFirst();

    res.json({
      totalUsers,
      activeToday,
      totalPenalties,
      activeAnnouncements,
      damageFee: settings ? parseFloat(settings.damage_fee) : 0,
      lostBookFee: settings ? parseFloat(settings.lost_book_fee) : 0
    });
  } catch (error) {
    console.error('Error fetching settings stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/settings/library-rules
const getLibraryRules = async (req, res) => {
  try {
    const rules = await prisma.librarySettings.findFirst();
    if (!rules) {
      return res.status(404).json({ error: 'Rules not found' });
    }
    // Parse decimals to numbers for frontend input fields
    res.json({
      ...rules,
      penalty_fee_per_day: parseFloat(rules.penalty_fee_per_day),
      suspension_threshold: parseFloat(rules.suspension_threshold),
      damage_fee: parseFloat(rules.damage_fee),
      lost_book_fee: parseFloat(rules.lost_book_fee)
    });
  } catch (error) {
    console.error('Error fetching library rules:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /api/settings/library-rules
const updateLibraryRules = async (req, res) => {
  try {
    const rules = await prisma.librarySettings.findFirst();
    if (!rules) {
      return res.status(404).json({ error: 'Rules not found' });
    }

    const updated = await prisma.librarySettings.update({
      where: { id: rules.id },
      data: {
        library_capacity: parseInt(req.body.library_capacity),
        max_books_per_user: parseInt(req.body.max_books_per_user),
        borrow_duration_students: parseInt(req.body.borrow_duration_students),
        borrow_duration_faculty: parseInt(req.body.borrow_duration_faculty),
        penalty_fee_per_day: parseFloat(req.body.penalty_fee_per_day),
        suspension_threshold: parseFloat(req.body.suspension_threshold),
        damage_fee: parseFloat(req.body.damage_fee),
        lost_book_fee: parseFloat(req.body.lost_book_fee)
      }
    });
    
    res.json({
      ...updated,
      penalty_fee_per_day: parseFloat(updated.penalty_fee_per_day),
      suspension_threshold: parseFloat(updated.suspension_threshold),
      damage_fee: parseFloat(updated.damage_fee),
      lost_book_fee: parseFloat(updated.lost_book_fee)
    });
  } catch (error) {
    console.error('Error updating library rules:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/settings/users
const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        student_id: true,
        card_no: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
        status: true,
        program: {
          select: { name: true }
        },
        penalties: {
          where: { status: 'UNPAID' }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const formattedUsers = users.map(u => {
      const penaltySum = u.penalties.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      return {
        id: u.id,
        student_id: u.student_id,
        card_no: u.card_no,
        name: `${u.first_name} ${u.last_name}`,
        email: u.email,
        role: u.role,
        program: u.program ? u.program.name : 'N/A',
        status: u.status,
        penalty: penaltySum
      };
    });

    res.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching settings users:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/settings/announcements
const getAnnouncements = async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { created_at: 'desc' }
    });
    res.json(announcements);
  } catch (error) {
    console.error('Error fetching settings announcements:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/settings/announcements
const createAnnouncement = async (req, res) => {
  try {
    const sanitizeHtml = (str) => {
      if (!str) return '';
      return str.replace(/<[^>]*>?/gm, ''); 
    };

    const announcement = await prisma.announcement.create({
      data: {
        title: sanitizeHtml(req.body.title),
        body: sanitizeHtml(req.body.body),
        priority: req.body.priority || 'NORMAL',
        is_active: req.body.is_active !== undefined ? req.body.is_active : true,
      }
    });
    
    res.status(201).json(announcement);
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE /api/settings/announcements/:id
const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.announcement.delete({
      where: { id: parseInt(id) }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/settings/programs
const getPrograms = async (req, res) => {
  try {
    const programs = await prisma.program.findMany({
      where: {
        name: {
          not: 'Faculty'
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(programs);
  } catch (error) {
    console.error('Error fetching programs:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /api/settings/users/:id/role
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['STUDENT', 'FACULTY'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be STUDENT or FACULTY.' });
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { role }
    });

    res.json({ success: true, role: user.role });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Server error updating role' });
  }
};

module.exports = {
  getStats,
  getLibraryRules,
  updateLibraryRules,
  getUsers,
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  getPrograms,
  updateUserRole
};
