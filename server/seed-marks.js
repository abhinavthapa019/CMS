const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function classKey(row) {
  return `${row.batch}|${row.faculty}|${row.section}`;
}

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

async function run() {
  const students = await prisma.student.findMany({
    select: { id: true, batch: true, faculty: true, section: true },
    orderBy: [{ id: "asc" }],
  });

  if (students.length === 0) {
    throw new Error("No students found. Run seed-students first.");
  }

  const classTeacherAssignments = await prisma.classTeacherAssignment.findMany({
    select: { teacherId: true, batch: true, faculty: true, section: true },
  });

  const teacherFallback = await prisma.user.findFirst({
    where: { role: "TEACHER" },
    select: { id: true },
    orderBy: [{ id: "asc" }],
  });

  if (!teacherFallback) {
    throw new Error("No TEACHER users found. Run seed-teachers first.");
  }

  const teacherByClass = new Map();
  for (const a of classTeacherAssignments) {
    teacherByClass.set(classKey(a), a.teacherId);
  }

  await prisma.mark.deleteMany();

  const rows = [];

  for (const s of students) {
    const teacherId = teacherByClass.get(classKey(s)) || teacherFallback.id;

    // Grade scale: 0..20 (consistent with UCI dataset mapping)
    const g1 = randInt(6, 18);
    const g2 = Math.max(0, Math.min(20, g1 + randInt(-4, 4)));
    const activities = Math.random() < 0.35;

    // Optionally seed finalGrade for some students
    const finalGrade = Math.random() < 0.6 ? Math.max(0, Math.min(20, g2 + randInt(-3, 3))) : null;

    rows.push({
      studentId: s.id,
      teacherId,
      g1,
      g2,
      finalGrade,
      activities,
    });
  }

  await prisma.mark.createMany({ data: rows });

  console.log(`Seeded marks for ${rows.length} students.`);
}

run()
  .catch((err) => {
    console.error("ERROR", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
