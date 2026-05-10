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

function classKey(c) {
  return `${c.batch}|${c.faculty}|${c.section}`;
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function buildCurrentMonthWeekdaysUpToTodayUtc() {
  const now = new Date();
  const todayUtc = startOfUtcDay(now);
  const start = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), 1, 0, 0, 0, 0));

  const dates = [];
  for (let d = new Date(start); d <= todayUtc; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = d.getUTCDay();
    // Monday-Friday
    if (dow >= 1 && dow <= 5) {
      dates.push(new Date(d));
    }
  }
  return dates;
}

function getCurrentMonthRangeUtc() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { start, end };
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

  const dates = buildCurrentMonthWeekdaysUpToTodayUtc();
  const totalDays = dates.length;

  if (totalDays === 0) {
    throw new Error("No weekdays found to seed for the current month up to today.");
  }

  const monthRange = getCurrentMonthRangeUtc();

  await prisma.attendance.deleteMany({
    where: {
      date: {
        gte: monthRange.start,
        lt: monthRange.end,
      },
    },
  });

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

  const periodStart = dates[0].toISOString().slice(0, 10);
  const periodEnd = dates[dates.length - 1].toISOString().slice(0, 10);
  console.log(`Seeded attendance for ${students.length} students from ${periodStart} to ${periodEnd} across ${totalDays} weekdays (current month up to today).`);
}

run()
  .catch((err) => {
    console.error("ERROR", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
