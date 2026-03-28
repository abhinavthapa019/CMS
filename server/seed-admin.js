const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

(async () => {
  const password = await bcrypt.hash("admin123", 10);
  const user = await prisma.user.upsert({
    where: { email: "admin@campus.local" },
    create: { name: "Admin", email: "admin@campus.local", password, role: "ADMIN" },
    update: { password, name: "Admin", role: "ADMIN" },
  });
  console.log("reset for", user.email);
})()
  .catch((err) => {
    console.error("ERROR", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
