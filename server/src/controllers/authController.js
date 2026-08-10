const prisma = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role, student_id: user.student_id },
    process.env.JWT_SECRET || 'fallback_secret_key',
    { expiresIn: '7d' }
  );
};

const register = async (req, res) => {
  try {
    const { first_name, last_name, email, password, role, year_level, program } = req.body;

    // Basic validation
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

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
    res.status(201).json({ user, token });
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
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!user.password_hash) {
      return res.status(401).json({ error: 'This account does not have a password. Please use alternative login methods or contact administration.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = generateToken(user);
    res.json({ user, token });
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

    // Don't return password hash
    const { password_hash, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Server error retrieving profile.' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { email, password, year_level, program } = req.body;
    
    // Build update object
    const updateData = {};
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
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '30s' }
    );
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR token' });
  }
};

module.exports = { register, login, getMe, updateProfile, getQrToken };
