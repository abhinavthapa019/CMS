const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function classKey(c) {
  return `${c.batch}|${c.faculty}|${c.section}`;
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function buildWeekdaysUtc(start, end) {
  const dates = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = d.getUTCDay();
    if (dow >= 1 && dow <= 5) dates.push(new Date(d));
  }
  return dates;
}

function pickDateSet(dates, presentCount) {
  return new Set(shuffle([...dates]).slice(0, Math.max(0, Math.min(presentCount, dates.length))));
}

function randBetween(min, max) {
  return min + Math.random() * (max - min);
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

  const start = new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0));
  const todayUtc = startOfUtcDay(new Date());

  if (todayUtc < start) {
    throw new Error("Current date is before 2026. Adjust the seed date range.");
  }

  const dates = buildWeekdaysUtc(start, todayUtc);
  const totalDays = dates.length;

  if (totalDays === 0) {
    throw new Error("No weekdays found to seed for 2026 up to today.");
  }

  await prisma.attendance.deleteMany({
    where: {
      date: {
        gte: start,
        lt: new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), todayUtc.getUTCDate() + 1, 0, 0, 0, 0)),
      },
    },
  });

  const studentsByClass = new Map();
  for (const student of students) {
    const key = classKey(student);
    const existing = studentsByClass.get(key) || [];
    existing.push(student);
    studentsByClass.set(key, existing);
  }

  for (const [key, classStudents] of studentsByClass.entries()) {
    const assignment = assignmentByClass.get(key);
    if (!assignment) {
      throw new Error(`No assignment found for class ${key}`);
    }

    const shuffled = shuffle([...classStudents]);
    const perfectCount = Math.min(1, classStudents.length);
    const zeroCount = Math.min(1, Math.max(0, classStudents.length - perfectCount));
    const remaining = Math.max(0, classStudents.length - perfectCount - zeroCount);
    const lowCount = Math.min(2, Math.max(1, Math.floor(randBetween(1, Math.min(2, remaining) + 0.1))));

    const perfectIds = new Set(shuffled.slice(0, perfectCount).map((s) => s.id));
    const zeroIds = new Set(shuffled.slice(perfectCount, perfectCount + zeroCount).map((s) => s.id));
    const lowAttendanceIds = new Set(shuffled.slice(perfectCount + zeroCount, perfectCount + zeroCount + lowCount).map((s) => s.id));

    for (const student of classStudents) {
      let presentCount;
      if (perfectIds.has(student.id)) {
        presentCount = totalDays;
      } else if (zeroIds.has(student.id)) {
        presentCount = 0;
      } else if (lowAttendanceIds.has(student.id)) {
        const ratio = randBetween(0.2, 0.38);
        presentCount = Math.max(0, Math.floor(totalDays * ratio));
      } else {
        const ratio = randBetween(0.7, 0.98);
        presentCount = Math.max(1, Math.floor(totalDays * ratio));
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
  }

  const periodStart = dates[0].toISOString().slice(0, 10);
  const periodEnd = dates[dates.length - 1].toISOString().slice(0, 10);
  console.log(`Seeded attendance for ${students.length} students from ${periodStart} to ${periodEnd} across ${totalDays} weekdays.`);
  console.log("Low attendance: 1-3 students per class below 40%.");
}

run()
  .catch((err) => {
    console.error("ERROR", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
