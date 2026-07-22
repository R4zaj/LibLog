const prisma = require('../db');

const getActiveAnnouncements = async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: {
        is_active: true
      },
      orderBy: [
        { priority: 'asc' }, // Assuming URGENT, HIGH, NORMAL, LOW order
        { created_at: 'desc' }
      ]
    });
    res.json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Server error fetching announcements' });
  }
};

module.exports = { getActiveAnnouncements };
