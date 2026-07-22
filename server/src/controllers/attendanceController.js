const prisma = require('../db');
const jwt = require('jsonwebtoken');

const getStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const logs = await prisma.attendanceLog.findMany({
      where: {
        logged_at: {
          gte: today
        }
      }
    });

    let checkIns = 0;
    let checkOuts = 0;
    let insideNow = 0;
    let totalDuration = 0;
    let durationCount = 0;

    const userStatus = {}; // userId -> status ('IN' or 'OUT')

    logs.forEach(log => {
      if (log.action === 'CHECK_IN') {
        checkIns++;
        userStatus[log.user_id] = 'IN';
      } else if (log.action === 'CHECK_OUT') {
        checkOuts++;
        userStatus[log.user_id] = 'OUT';
        if (log.duration_minutes) {
          totalDuration += log.duration_minutes;
          durationCount++;
        }
      }
    });

    for (const status of Object.values(userStatus)) {
      if (status === 'IN') insideNow++;
    }

    const avgDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

    // Heatmap data: last 30 days CHECK_INs
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const heatmapLogs = await prisma.attendanceLog.findMany({
      where: {
        action: 'CHECK_IN',
        logged_at: { gte: thirtyDaysAgo }
      },
      select: { logged_at: true }
    });

    const heatmapCounts = Array(7).fill().map(() => Array(12).fill(0));
    // JS Date getDay(): Sun=0 -> Frontend: Sun=6
    const dayMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };
    
    heatmapLogs.forEach(log => {
      const d = new Date(log.logged_at);
      const dayIdx = dayMap[d.getDay()];
      const h = d.getHours();
      // Frontend hours: 7am (0) to 6pm (11)
      if (h >= 7 && h <= 18) {
        heatmapCounts[dayIdx][h - 7]++;
      }
    });

    res.json({ checkIns, checkOuts, insideNow, avgDuration, heatmapCounts });
  } catch (error) {
    console.error('Attendance Stats Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const scanQR = async (req, res) => {
  try {
    const { identifier } = req.body;
    
    let searchId = identifier;

    // Check if identifier is a JWT
    if (identifier.split('.').length === 3) {
      try {
        const decoded = jwt.verify(identifier, process.env.JWT_SECRET || 'fallback_secret_key');
        if (decoded && decoded.student_id) {
          searchId = decoded.student_id;
        }
      } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired QR token' });
      }
    }

    // First, try to match against the full exact identifier
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { student_id: searchId },
          { qr_code: searchId }
        ]
      }
    });

    // If not found and identifier starts with CCC-, try without prefix
    if (!user && searchId.startsWith('CCC-')) {
      const studentId = searchId.replace('CCC-', '');
      user = await prisma.user.findFirst({
        where: { student_id: studentId }
      });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check last action
    const lastLog = await prisma.attendanceLog.findFirst({
      where: { user_id: user.id },
      orderBy: { logged_at: 'desc' }
    });

    let action = 'CHECK_IN';
    let duration = null;

    if (lastLog && lastLog.action === 'CHECK_IN') {
      // User is currently checked in, so check them out
      action = 'CHECK_OUT';
      const diffTime = Math.abs(new Date() - new Date(lastLog.logged_at));
      duration = Math.round(diffTime / (1000 * 60)); // minutes
    }

    await prisma.attendanceLog.create({
      data: {
        user_id: user.id,
        action: action,
        scanned_qr: identifier,
        duration_minutes: duration
      }
    });

    res.json({ user, action, duration });
  } catch (error) {
    console.error('Attendance Scan Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getActiveUsers = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const logs = await prisma.attendanceLog.findMany({
      where: {
        logged_at: {
          gte: today
        }
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            role: true,
            program: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        logged_at: 'asc'
      }
    });

    const userStatus = {}; 
    logs.forEach(log => {
      if (log.action === 'CHECK_IN') {
        userStatus[log.user_id] = { status: 'IN', user: log.user, logged_at: log.logged_at };
      } else if (log.action === 'CHECK_OUT') {
        userStatus[log.user_id] = { status: 'OUT', user: log.user, logged_at: log.logged_at };
      }
    });

    const activeUsers = Object.values(userStatus)
      .filter(item => item.status === 'IN')
      .map(item => ({
        id: item.user.id,
        first_name: item.user.first_name,
        last_name: item.user.last_name,
        role: item.user.role,
        department: item.user.program?.name || 'N/A',
        checked_in_at: item.logged_at
      }));

    res.json(activeUsers);
  } catch (error) {
    console.error('Active Users Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getMyHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const logs = await prisma.attendanceLog.findMany({
      where: { user_id: userId },
      orderBy: { logged_at: 'desc' },
      take: 50 // Limit to recent 50
    });
    res.json(logs);
  } catch (error) {
    console.error('Get My History Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getStats, scanQR, getActiveUsers, getMyHistory };
