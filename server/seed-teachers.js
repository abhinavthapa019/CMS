const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function run() {
  const pw = async (p) => bcrypt.hash(p, 10);
  const users = [
    { email: "ram.t1@campus.local", name: "Ram T1", role: "TEACHER", password: await pw("tiger123") },
    { email: "sam.t2@campus.local", name: "Sam T2", role: "TEACHER", password: await pw("eagle123") },
    { email: "pari.t3@campus.local", name: "Pari T3", role: "TEACHER", password: await pw("panda123") },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      create: u,
      update: { password: u.password, name: u.name, role: u.role },
    });
    console.log("reset", u.email);
  }
}

run()
  .catch((e) => {
    console.error("ERROR", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
