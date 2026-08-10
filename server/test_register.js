require('dotenv').config();
const prisma = require('./src/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function test() {
  try {
    const password = 'Test@1234';
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
    const uniqueQrCode = `QR-${crypto.randomUUID()}`;

    console.log("student_id:", student_id);
    console.log("uniqueQrCode:", uniqueQrCode);

    const user = await prisma.user.create({
      data: {
        first_name: 'Test',
        last_name: 'Test',
        email: 'test_local_script@test.com',
        student_id,
        card_no: student_id,
        password_hash: hashedPassword,
        role: 'STUDENT',
        status: 'ACTIVE',
        qr_code: uniqueQrCode
      }
    });

    console.log("User created:", user.id);
    await prisma.user.delete({ where: { id: user.id }});
    console.log("User deleted.");
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
