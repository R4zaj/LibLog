require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:liblog%40ccc123@db.skpeggitbycwkmkngyai.supabase.co:5432/postgres' } } });
async function check() {
  try {
    const count = await prisma.book.count();
    console.log('Count:', count);
  } catch(e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}
check();
