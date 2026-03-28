const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function run() {
  const students = await prisma.student.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      batch: true,
      faculty: true,
      section: true,
      rollNumber: true,
    },
    orderBy: { id: "asc" },
  });

  const grouped = await prisma.attendance.groupBy({
    by: ["studentId"],
    _count: { _all: true },
  });

  const present = await prisma.attendance.groupBy({
    by: ["studentId"],
    where: { present: true },
    _count: { _all: true },
  });

  const totalByStudent = new Map(grouped.map((r) => [r.studentId, r._count._all]));
  const presentByStudent = new Map(present.map((r) => [r.studentId, r._count._all]));

  const stats = students.map((s) => {
    const total = totalByStudent.get(s.id) || 0;
    const presentCount = presentByStudent.get(s.id) || 0;
    const pct = total ? Math.round((presentCount / total) * 100) : 0;
    return {
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      batch: s.batch,
      faculty: s.faculty,
      section: s.section,
      rollNumber: s.rollNumber,
      total,
      presentCount,
      pct,
    };
  });

  const summary = {
    students: students.length,
    attendanceRows: grouped.reduce((acc, row) => acc + row._count._all, 0),
    missingStudents: stats.filter((s) => s.total === 0).length,
    below20: stats.filter((s) => s.pct < 20).length,
    below40: stats.filter((s) => s.pct < 40).length,
    full: stats.filter((s) => s.pct === 100).length,
    above70: stats.filter((s) => s.pct >= 70).length,
  };

  console.log(JSON.stringify(summary, null, 2));
  console.log("Top sample:");
  console.log(JSON.stringify(stats.slice(0, 10), null, 2));
}

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
