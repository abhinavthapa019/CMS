const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const users = [
  { name: "Admin", email: "admin@campus.local", password: "$2a$10$4z9X2pOupB69ZsFURrJX/um9KqS5WyhVhwJ/dFaSMjo12mRofiw4.", role: "ADMIN" },
  { name: "Ram T1", email: "ram.t1@campus.local", password: "$2a$10$5W8aF4Tn4pGgXiL8gPc41ujmOqJrYG2/irXXeA9wjrPHu4y7t.q9i", role: "TEACHER" },
  { name: "Sam T2", email: "sam.t2@campus.local", password: "$2a$10$dF2uW6zIgM2BLdE7QgR30OkMfAn/4EbR85ZZPSnZhp1DW7mMvPUze", role: "TEACHER" },
  { name: "Pari T3", email: "pari.t3@campus.local", password: "$2a$10$2gtn3Z7hI2bsaFHsQKCWl.jjoU72Xg4y7zYyWS8x5tpC3x4pz0ruS", role: "TEACHER" },
];

(async () => {
  for (const u of users) {
    const r = await prisma.user.upsert({ where: { email: u.email }, create: u, update: {} });
    console.log("upserted", r.email);
  }
  console.log("done");
})()
  .catch((e) => { console.error("ERROR", e); process.exit(1); })
  .finally(() => prisma.$disconnect());