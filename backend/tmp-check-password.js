require('dotenv/config');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'teste@email.com' } });
  console.log('user exists?', !!user);
  if (user) {
    const ok1 = await bcrypt.compare('123456', user.passwordHash);
    const ok2 = await bcrypt.compare('12345678', user.passwordHash);
    console.log('matches 123456?', ok1);
    console.log('matches 12345678?', ok2);
  }
}

main()
  .catch((err) => console.error(err))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
