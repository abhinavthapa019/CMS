const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function run() {
  const teachers = [
    { name: "Sushil Adhikari", email: "sushil.adhikari@campus.local", password: "sushil123" },
    { name: "Rojina Karki", email: "rojina.karki@campus.local", password: "rojina123" },
    { name: "Bikram Shrestha", email: "bikram.shrestha@campus.local", password: "bikram123" },
    { name: "Dipesh Poudel", email: "dipesh.poudel@campus.local", password: "dipesh123" },
    { name: "Anjana Rai", email: "anjana.rai@campus.local", password: "anjana123" },
    { name: "Kiran Bhandari", email: "kiran.bhandari@campus.local", password: "kiran123" },
    { name: "Sarita Khadka", email: "sarita.khadka@campus.local", password: "sarita123" },
    { name: "Prabin Koirala", email: "prabin.koirala@campus.local", password: "prabin123" },
    { name: "Sagar Bhattarai", email: "sagar.bhattarai@campus.local", password: "sagar123" },
    { name: "Manisha Thapa", email: "manisha.thapa@campus.local", password: "manisha123" },
    { name: "Kamal Gurung", email: "kamal.gurung@campus.local", password: "kamal123" },
    { name: "Nisha Acharya", email: "nisha.acharya@campus.local", password: "nisha123" },
    { name: "Ramesh Oli", email: "ramesh.oli@campus.local", password: "ramesh123" },
    { name: "Pooja Basnet", email: "pooja.basnet@campus.local", password: "pooja123" },
    { name: "Roshan Lama", email: "roshan.lama@campus.local", password: "roshan123" },
    { name: "Binita Nepal", email: "binita.nepal@campus.local", password: "binita123" },
    { name: "Sabina Kafle", email: "sabina.kafle@campus.local", password: "sabina123" },
    { name: "Pratima Gautam", email: "pratima.gautam@campus.local", password: "pratima123" },
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
