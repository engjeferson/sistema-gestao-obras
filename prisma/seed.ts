import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const FINANCIAL_CATEGORIES = [
  "Material",
  "Mão de obra",
  "Equipamentos",
  "Ferramentas",
  "Serviços terceirizados",
  "Transporte",
  "Administrativo",
  "Impostos",
  "Outros",
];

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@empresa.com.br";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "trocar123";

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Administrador",
      email: adminEmail,
      passwordHash,
      role: "ADMINISTRADOR",
    },
  });

  for (const nome of FINANCIAL_CATEGORIES) {
    await prisma.financialCategory.upsert({
      where: { nome },
      update: {},
      create: { nome },
    });
  }

  const existingCompanySettings = await prisma.companySettings.findFirst();
  if (existingCompanySettings) {
    await prisma.companySettings.update({
      where: { id: existingCompanySettings.id },
      data: { nome: "Reis Engenharia & Construções" },
    });
  } else {
    await prisma.companySettings.create({
      data: { nome: "Reis Engenharia & Construções" },
    });
  }

  console.log(`Seed concluído. Usuário admin: ${adminEmail} / senha: ${adminPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
