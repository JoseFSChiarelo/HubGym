require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, role: true },
    orderBy: { createdAt: 'desc' }
  });
  console.log('All users:', users);
  const athletes = users.filter((u) => u.role === 'ATHLETE');
  console.log('Athletes:', athletes);
}

main()
  .catch((err) => {
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
