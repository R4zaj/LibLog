const prisma = require('../db');
const jwt = require('jsonwebtoken');
const { notifyAttendance } = require('../services/notificationService');

const getStats = async (req, res) => {
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
            student_id: true,
            card_no: true,
            first_name: true,
            last_name: true,
            email: true,
            role: true,
            year_level: true,
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

    let checkIns = 0;
    let checkOuts = 0;
    let totalDuration = 0;
    let durationCount = 0;

    const userStatus = {}; // userId -> { status, user, logged_at }

    logs.forEach(log => {
      if (log.action === 'CHECK_IN') {
        checkIns++;
        userStatus[log.user_id] = { status: 'IN', user: log.user, logged_at: log.logged_at };
      } else if (log.action === 'CHECK_OUT') {
        checkOuts++;
        userStatus[log.user_id] = { status: 'OUT', user: log.user, logged_at: log.logged_at };
        if (log.duration_minutes) {
          totalDuration += log.duration_minutes;
          durationCount++;
        }
      }
    });

    const activeUsers = Object.values(userStatus)
      .filter(item => item.status === 'IN' && item.user)
      .map(item => ({
        id: item.user.id,
        student_id: item.user.student_id,
        card_no: item.user.card_no,
        first_name: item.user.first_name,
        last_name: item.user.last_name,
        email: item.user.email,
        role: item.user.role,
        year_level: item.user.year_level,
        department: item.user.program?.name || 'General',
        checked_in_at: item.logged_at
      }));

    const insideNow = activeUsers.length;
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

    res.json({ checkIns, checkOuts, insideNow, avgDuration, heatmapCounts, activeUsers });
  } catch (error) {
    console.error('Attendance Stats Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const scanQR = async (req, res) => {
  try {
    const { identifier } = req.body;
    
    let searchId = identifier;

    if (identifier.startsWith('OFFLINE:')) {
      const parts = identifier.split(':');
      if (parts.length === 4) {
        const [, stId, ts, hmac] = parts;
        const timestamp = parseInt(ts, 10);
        if (Date.now() - timestamp > 60000 || Date.now() - timestamp < -5000) {
           return res.status(401).json({ error: 'Expired offline QR token' });
        }
        const crypto = require('crypto');
        const offlineSecret = crypto.createHmac('sha256', process.env.JWT_SECRET).update(stId).digest('hex');
        const expectedHmac = crypto.createHmac('sha256', offlineSecret).update(ts).digest('hex');
        if (hmac === expectedHmac) {
           searchId = stId;
        } else {
           return res.status(401).json({ error: 'Invalid offline QR signature' });
        }
      } else {
        return res.status(401).json({ error: 'Malformed offline QR token' });
      }
    } else if (identifier.split('.').length === 3) {
      try {
        const decoded = jwt.verify(identifier, process.env.JWT_SECRET);
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
      const diffTime = Math.abs(new Date() - new Date(lastLog.logged_at));
      const diffHours = diffTime / (1000 * 60 * 60);
      // Only treat as CHECK_OUT if the previous check-in happened within 18 hours.
      // If someone forgot to check out on a previous day/session, start fresh as CHECK_IN.
      if (diffHours <= 18) {
        action = 'CHECK_OUT';
        duration = Math.round(diffTime / (1000 * 60)); // minutes
      } else {
        action = 'CHECK_IN';
      }
    }

    const log = await prisma.attendanceLog.create({
      data: {
        user_id: user.id,
        action: action,
        scanned_qr: identifier,
        duration_minutes: duration
      }
    });

    try {
      await notifyAttendance({ user, action, duration, logId: log.id, tx: prisma });
    } catch (notifErr) {
      console.error('Failed to create attendance notification:', notifErr);
    }

    const { password_hash, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, action, duration });
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
            student_id: true,
            card_no: true,
            first_name: true,
            last_name: true,
            email: true,
            role: true,
            year_level: true,
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
      .filter(item => item.status === 'IN' && item.user)
      .map(item => ({
        id: item.user.id,
        student_id: item.user.student_id,
        card_no: item.user.card_no,
        first_name: item.user.first_name,
        last_name: item.user.last_name,
        email: item.user.email,
        role: item.user.role,
        year_level: item.user.year_level,
        department: item.user.program?.name || 'General',
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
