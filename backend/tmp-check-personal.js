require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })) });

async function main() {
  const personals = await prisma.personalProfile.findMany({ include: { user: true } });
  console.log(personals);
}

main()
  .catch((err) => console.error(err))
  .finally(async () => {
    await prisma.$disconnect();
  });
