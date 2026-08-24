require('dotenv/config');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL não definido. Crie o .env antes de rodar o seed.');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = 'jose04082016@gmail.com';
  const adminPassword = '12345678';
  const adminHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminHash,
      role: 'ADMIN'
    },
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      role: 'ADMIN'
    }
  });

  // Limpa personals anteriores e dados relacionados
  const existingPersonals = await prisma.personalProfile.findMany({ select: { id: true, userId: true } });
  const personalIds = existingPersonals.map((p) => p.id);
  const personalUserIds = existingPersonals.map((p) => p.userId);

  if (personalIds.length > 0) {
    await prisma.$transaction([
      prisma.formResponse.deleteMany({ where: { athlete: { personalId: { in: personalIds } } } }),
      prisma.formRequest.deleteMany({ where: { athlete: { personalId: { in: personalIds } } } }),
      prisma.formField.deleteMany({ where: { form: { personalId: { in: personalIds } } } }),
      prisma.form.deleteMany({ where: { personalId: { in: personalIds } } }),
      prisma.athlete.deleteMany({ where: { personalId: { in: personalIds } } }),
      prisma.payment.deleteMany({ where: { personalId: { in: personalIds } } }),
      prisma.personalProfile.deleteMany({ where: { id: { in: personalIds } } }),
      prisma.user.deleteMany({ where: { id: { in: personalUserIds } } })
    ]);
  }

  const personalEmail = 'marioP@email.com';
  const personalPassword = '123456';
  const personalHash = await bcrypt.hash(personalPassword, 10);

  // Remove quaisquer usuários PERSONAL remanescentes que não sejam o alvo
  await prisma.user.deleteMany({
    where: {
      role: 'PERSONAL',
      email: { not: personalEmail }
    }
  });

  // Plano fake para associar ao personal
  let plan = await prisma.plan.findFirst({ where: { name: 'Plano Mensal Pro' } });
  if (!plan) {
    plan = await prisma.plan.create({
      data: { name: 'Plano Mensal Pro', price: 199.9, description: 'Acesso total ao painel' }
    });
  } else {
    plan = await prisma.plan.update({
      where: { id: plan.id },
      data: { price: 199.9, description: 'Acesso total ao painel' }
    });
  }

  const timestamp = Date.now().toString();
  const personalProfileData = {
    name: 'Mario',
    phone: '(11) 90000-0000',
    cpf: `000${timestamp.slice(-8)}`,
    cref: `CREF-${timestamp.slice(-6)}`,
    planStatus: 'ACTIVE',
    planId: plan.id
  };

  // Reutiliza o personal existente pelo CPF/CREf para evitar conflitos de unicidade
  const personal = await prisma.user.upsert({
    where: { email: personalEmail },
    update: {
      passwordHash: personalHash,
      role: 'PERSONAL',
      personal: {
        upsert: {
          update: personalProfileData,
          create: personalProfileData
        }
      }
    },
    create: {
      email: personalEmail,
      passwordHash: personalHash,
      role: 'PERSONAL',
      personal: { create: personalProfileData }
    },
    include: { personal: true }
  });

  // Pagamento fake se ainda não existir nenhum para esse personal
  const existingPayments = await prisma.payment.count({ where: { personalId: personal.personal?.id } });
  if (existingPayments === 0 && personal.personal?.id) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);
    await prisma.payment.create({
      data: {
        personalId: personal.personal.id,
        amount: plan.price,
        status: 'PENDING',
        dueDate
      }
    });
  }

  console.log('Admin criado/atualizado:', admin.email);
  console.log('Personal criado/atualizado:', personal.email);
}

main()
  .catch((e) => {
    console.error('Erro ao criar admin:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
