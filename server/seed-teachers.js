const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function run() {
  const teachers = [
    { name: "Sanjay Gurung", email: "sanjay.gurung@campus.local", password: "sanjay123" },
    { name: "Anita Shrestha", email: "anita.shrestha@campus.local", password: "anita123" },
    { name: "Bikash Karki", email: "bikash.karki@campus.local", password: "bikash123" },
    { name: "Prakash Thapa", email: "prakash.thapa@campus.local", password: "prakash123" },
    { name: "Nirmala Rai", email: "nirmala.rai@campus.local", password: "nirmala123" },
    { name: "Roshan Lama", email: "roshan.lama@campus.local", password: "roshan123" },
    { name: "Manisha Poudel", email: "manisha.poudel@campus.local", password: "manisha123" },
    { name: "Deepak Adhikari", email: "deepak.adhikari@campus.local", password: "deepak123" },
    { name: "Sarita KC", email: "sarita.kc@campus.local", password: "sarita123" },
    { name: "Kamal Bhattarai", email: "kamal.bhattarai@campus.local", password: "kamal123" },
    { name: "Binita Rana", email: "binita.rana@campus.local", password: "binita123" },
    { name: "Prabin Malla", email: "prabin.malla@campus.local", password: "prabin123" },
    { name: "Sabina Dhakal", email: "sabina.dhakal@campus.local", password: "sabina123" },
  ];

  const teacherEmails = teachers.map((t) => t.email);

  const oldTeachers = await prisma.user.findMany({
    where: {
      role: "TEACHER",
      email: { notIn: teacherEmails },
    },
    select: { id: true },
  });

  if (oldTeachers.length > 0) {
    const ids = oldTeachers.map((t) => t.id);
    await prisma.$transaction([
      prisma.teacherSubjectAssignment.deleteMany({ where: { teacherId: { in: ids } } }),
      prisma.attendance.deleteMany({ where: { teacherId: { in: ids } } }),
      prisma.mark.deleteMany({ where: { teacherId: { in: ids } } }),
      prisma.user.deleteMany({ where: { id: { in: ids } } }),
    ]);
  }

  for (const t of teachers) {
    const hashed = await bcrypt.hash(t.password, 10);
    await prisma.user.upsert({
      where: { email: t.email },
      create: { name: t.name, email: t.email, password: hashed, role: "TEACHER" },
      update: { name: t.name, password: hashed, role: "TEACHER" },
    });
    console.log("reset", t.email, "password:", t.password);
  }
}

run()
  .catch((e) => {
    console.error("ERROR", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
