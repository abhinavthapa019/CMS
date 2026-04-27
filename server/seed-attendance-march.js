const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickDateSet(dates, presentCount) {
  return new Set(shuffle([...dates]).slice(0, Math.max(0, Math.min(presentCount, dates.length))));
}

function buildDateRange(year = new Date().getFullYear()) {
  const dates = [];
  const start = new Date(Date.UTC(year, 2, 1, 0, 0, 0, 0)); // March 1
  const end = new Date(Date.UTC(year, 3, 15, 0, 0, 0, 0)); // April 15

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = d.getUTCDay();
    // Monday-Friday
    if (dow >= 1 && dow <= 5) {
      dates.push(new Date(d));
    }
  }
  return dates;
}

function classKey(c) {
  return `${c.batch}|${c.faculty}|${c.section}`;
}

async function run() {
  const students = await prisma.student.findMany({
    orderBy: [{ id: "asc" }],
    select: { id: true, batch: true, faculty: true, section: true },
  });

  if (students.length === 0) {
    throw new Error("No students found. Run seed-students first.");
  }

  const classTeacherAssignments = await prisma.classTeacherAssignment.findMany({
    select: {
      teacherId: true,
      batch: true,
      faculty: true,
      section: true,
    },
  });

  if (classTeacherAssignments.length === 0) {
    throw new Error("No class-teacher assignments found. Run seed-subjects first.");
  }

  const assignmentByClass = new Map();
  for (const assignment of classTeacherAssignments) {
    assignmentByClass.set(classKey(assignment), { teacherId: assignment.teacherId });
  }

  const dates = buildDateRange();
  const totalDays = dates.length;

  await prisma.attendance.deleteMany();

  const allIds = students.map((s) => s.id);
  const shuffled = shuffle([...allIds]);
  const fullSet = new Set(shuffled.slice(0, 3));
  const below20Id = shuffled[3];
  const below40Id = shuffled[4];

  for (const student of students) {
    const key = classKey(student);
    const assignment = assignmentByClass.get(key);
    if (!assignment) {
      throw new Error(`No assignment found for class ${key}`);
    }

    let presentCount;
    if (fullSet.has(student.id)) {
      presentCount = totalDays;
    } else if (student.id === below20Id) {
      presentCount = Math.max(1, Math.floor(totalDays * 0.15));
    } else if (student.id === below40Id) {
      presentCount = Math.max(2, Math.floor(totalDays * 0.35));
    } else {
      const min = Math.ceil(totalDays * 0.72);
      const max = Math.floor(totalDays * 0.98);
      presentCount = min + Math.floor(Math.random() * (Math.max(max - min, 0) + 1));
    }

    const presentDates = pickDateSet(dates, presentCount);

    for (const date of dates) {
      await prisma.attendance.create({
        data: {
          studentId: student.id,
          teacherId: assignment.teacherId,
          subjectId: null,
          date,
          present: presentDates.has(date),
        },
      });
    }
  }

  console.log(`Seeded attendance for ${students.length} students from March 1 to April 15 across ${totalDays} weekdays.`);
  console.log("Distribution rules applied: 3 full, 1 below 20%, 1 below 40%, others mostly above 70%.");
}

run()
  .catch((err) => {
    console.error("ERROR", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
