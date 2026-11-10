const prisma = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendOtpEmail } = require('../services/emailService');
const { syncUserPenaltyBalance } = require('../utils/penaltyCalculator');

const otpStore = new Map(); // Store OTPs in memory: { email: { otp, expiresAt } }

const requestOtp = async (req, res) => {
  try {
    const { email, identifier, type } = req.body;
    const lookupKey = (email || identifier || '').trim();
    if (!lookupKey) return res.status(400).json({ error: 'Email or Library ID is required' });

    let targetEmail = lookupKey;
    let studentName = 'Student';

    if (type === 'reset') {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: lookupKey, mode: 'insensitive' } },
            { student_id: lookupKey }
          ]
        }
      });
      if (!user) {
        return res.status(404).json({ error: 'No account found with this Email or Library ID.' });
      }
      targetEmail = user.email;
      studentName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.student_id || 'Student';
    } else {
      // Check if user already exists for registration
      const existingUser = await prisma.user.findFirst({ where: { email: lookupKey } });
      if (existingUser) return res.status(400).json({ error: 'User with this email already exists.' });
    }

    // Check 1-minute cooldown per target email
    const existingEntry = otpStore.get(targetEmail.toLowerCase());
    if (existingEntry && existingEntry.lastSentAt) {
      const elapsed = Date.now() - existingEntry.lastSentAt;
      const cooldownMs = 60 * 1000;
      if (elapsed < cooldownMs) {
        const remainingSec = Math.ceil((cooldownMs - elapsed) / 1000);
        return res.status(429).json({
          error: `Please wait ${remainingSec}s before requesting another verification code.`,
          retryAfter: remainingSec
        });
      }
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(targetEmail.toLowerCase(), { otp, expiresAt, lastSentAt: Date.now() });

    // Send formatted email via emailService
    await sendOtpEmail({
      to: targetEmail,
      otp,
      type,
      studentName
    });

    const maskedEmail = targetEmail.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + '*'.repeat(Math.max(1, b.length)));
    res.json({ message: 'Verification code sent successfully.', email: targetEmail, maskedEmail });
  } catch (error) {
    console.error('OTP request error:', error);
    res.status(500).json({ error: 'Failed to send verification code email.' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;
    if (!email || !otp || !new_password) {
      return res.status(400).json({ error: 'Email, verification code, and new password are required.' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: { email: { equals: cleanEmail, mode: 'insensitive' } }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Verify OTP
    const stored = otpStore.get(cleanEmail);
    if (!stored) {
      return res.status(400).json({ error: 'No verification code requested for this email or it has expired.' });
    }

    if (stored.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(cleanEmail);
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    otpStore.delete(cleanEmail); // consume OTP

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(new_password, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash }
    });

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error during password reset.' });
  }
};

// Visit/borrow/streak figures shown on the mobile home and profile screens.
// Only /auth/me used to compute these, so signing in or editing your profile
// left the client with a user object that had no stats at all.
const computeUserStats = async (userId) => {
  const borrowed = await prisma.borrowRecord.count({ where: { user_id: userId } });
  const visits = await prisma.attendanceLog.count({
    where: { user_id: userId, action: 'CHECK_IN' }
  });

  const logs = await prisma.attendanceLog.findMany({
    where: { user_id: userId, action: 'CHECK_IN' },
    select: { logged_at: true },
    orderBy: { logged_at: 'desc' }
  });

  const key = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const uniqueDates = [...new Set(logs.map(log => key(new Date(log.logged_at))))];

  const today = new Date();
  let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // A streak may end today or yesterday; anything older means it is broken.
  if (!uniqueDates.includes(key(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!uniqueDates.includes(key(cursor))) {
      return { borrowed, visits, streak: 0 };
    }
  }

  let streak = 0;
  while (uniqueDates.includes(key(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { borrowed, visits, streak };
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role, student_id: user.student_id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const register = async (req, res) => {
  try {
    const { first_name, last_name, email, password, role, year_level, program, otp } = req.body;

    // Basic validation
    if (!first_name || !last_name || !email || !password || !otp) {
      return res.status(400).json({ error: 'All fields and OTP are required.' });
    }

    // Verify OTP
    const stored = otpStore.get(email);
    if (!stored) {
      return res.status(400).json({ error: 'No OTP requested for this email or it has expired.' });
    }
    if (stored.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP.' });
    }
    if (Date.now() > stored.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    otpStore.delete(email); // consume OTP

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    // Generate CCC-YEAR-Number
    const currentYear = new Date().getFullYear();
    const prefix = `CCC-${currentYear}-`;
    const lastUser = await prisma.user.findFirst({
      where: { student_id: { startsWith: prefix } },
      orderBy: { student_id: 'desc' }
    });

    let nextNumber = 1;
    if (lastUser && lastUser.student_id) {
      const parts = lastUser.student_id.split('-');
      if (parts.length === 3) {
        nextNumber = parseInt(parts[2], 10) + 1;
      }
    }
    const student_id = `${prefix}${String(nextNumber).padStart(4, '0')}`;

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const crypto = require('crypto');
    const uniqueQrCode = `QR-${crypto.randomBytes(16).toString('hex')}`;

    let programId = null;
    if (role === 'STUDENT' && program) {
      const dbProgram = await prisma.program.findFirst({
        where: { name: program }
      });
      if (dbProgram) {
        programId = dbProgram.id;
      }
    }

    const user = await prisma.user.create({
      data: {
        first_name,
        last_name,
        email,
        student_id,
        card_no: student_id, // defaulting to student_id since UI doesn't provide separate card_no
        password_hash: hashedPassword,
        role: role === 'VISITOR' ? 'STUDENT' : (role || 'STUDENT'),
        year_level: (role === 'STUDENT' || role === 'VISITOR') ? year_level || null : null,
        program_id: programId,
        status: 'ACTIVE',
        qr_code: uniqueQrCode
      },
      include: { program: true }
    });

    const token = generateToken(user);
    const { password_hash, ...userWithoutPassword } = user;
    userWithoutPassword.stats = await computeUserStats(user.id);
    userWithoutPassword.penalty_balance = (await syncUserPenaltyBalance(prisma, user.id)).toFixed(2);
    res.status(201).json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error during registration.', details: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { student_id, email, password } = req.body;
    
    // We accept either student_id or email
    const loginIdentifier = student_id || email;

    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Library ID or Email, and password are required.' });
    }

    const user = await prisma.user.findFirst({
      where: { 
        OR: [
          { student_id: loginIdentifier },
          { email: loginIdentifier }
        ]
      },
      include: { program: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact the library administration.' });
    }

    if (!user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = generateToken(user);
    const { password_hash, ...userWithoutPassword } = user;
    userWithoutPassword.stats = await computeUserStats(user.id);
    userWithoutPassword.penalty_balance = (await syncUserPenaltyBalance(prisma, user.id)).toFixed(2);
    const crypto = require('crypto');
    userWithoutPassword.offline_secret = crypto.createHmac('sha256', process.env.JWT_SECRET).update(user.student_id).digest('hex');
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login.' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { program: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const { password_hash, ...userWithoutPassword } = user;
    userWithoutPassword.stats = await computeUserStats(req.user.id);
    userWithoutPassword.penalty_balance = (await syncUserPenaltyBalance(prisma, req.user.id)).toFixed(2);
    const crypto = require('crypto');
    userWithoutPassword.offline_secret = crypto.createHmac('sha256', process.env.JWT_SECRET).update(user.student_id).digest('hex');

    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Server error retrieving profile.' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { first_name, last_name, email, password, year_level, program } = req.body;
    
    // Build update object
    const updateData = {};
    if (typeof first_name === 'string') {
      const trimmedFirst = first_name.trim();
      if (!trimmedFirst) {
        return res.status(400).json({ error: 'First name cannot be empty.' });
      }
      updateData.first_name = trimmedFirst;
    }
    if (typeof last_name === 'string') {
      const trimmedLast = last_name.trim();
      if (!trimmedLast) {
        return res.status(400).json({ error: 'Last name cannot be empty.' });
      }
      updateData.last_name = trimmedLast;
    }
    if (email) updateData.email = email;
    if (year_level) updateData.year_level = year_level;
    
    // Hash new password if provided
    if (password) {
      const salt = await bcrypt.genSalt(12);
      updateData.password_hash = await bcrypt.hash(password, salt);
    }
    
    // Handle program relation if provided
    if (program) {
      const dbProgram = await prisma.program.findFirst({
        where: { 
          OR: [
            { name: { equals: program, mode: 'insensitive' } },
            { code: { equals: program, mode: 'insensitive' } }
          ]
        }
      });
      if (dbProgram) {
        updateData.program_id = dbProgram.id;
      } else {
        return res.status(400).json({ error: 'Program not found. Please enter a valid course name or code.' });
      }
    }
    
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      include: { program: true }
    });
    
    const { password_hash, ...userWithoutPassword } = user;
    userWithoutPassword.stats = await computeUserStats(user.id);
    userWithoutPassword.penalty_balance = (await syncUserPenaltyBalance(prisma, user.id)).toFixed(2);
    res.json({ user: userWithoutPassword, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error updating profile.' });
  }
};

const getQrToken = async (req, res) => {
  try {
    const token = jwt.sign(
      { student_id: req.user.student_id, type: 'qr_auth' },
      process.env.JWT_SECRET,
      { expiresIn: '1m' }
    );
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR token' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect current password.' });
    }

    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password_hash }
    });

    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error updating password.' });
  }
};

module.exports = { register, login, getMe, updateProfile, getQrToken, requestOtp, resetPassword, changePassword };
