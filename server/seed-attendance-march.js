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

function buildMarchDates(year = new Date().getFullYear()) {
  const dates = [];
  const endDay = new Date().getMonth() === 2 ? new Date().getDate() : 31;

  for (let day = 1; day <= endDay; day += 1) {
    const d = new Date(Date.UTC(year, 2, day, 0, 0, 0, 0));
    const dow = d.getUTCDay();
    // Monday-Friday
    if (dow >= 1 && dow <= 5) {
      dates.push(d);
    }
  }
  return dates;
}

function classCombosForAssignment(assignment) {
  const batches = assignment.batch ? [assignment.batch] : ["ELEVEN", "TWELVE"];

  if (assignment.subject?.faculty === "SCIENCE") {
    return batches.flatMap((batch) => [
      { batch, faculty: "SCIENCE", section: "BIO" },
      { batch, faculty: "SCIENCE", section: "CS" },
    ]);
  }

  if (assignment.subject?.faculty === "MANAGEMENT") {
    return batches.flatMap((batch) => [
      { batch, faculty: "MANAGEMENT", section: "ECONOMICS" },
      { batch, faculty: "MANAGEMENT", section: "MARKETING" },
    ]);
  }

  return batches.flatMap((batch) => [
    { batch, faculty: "SCIENCE", section: "BIO" },
    { batch, faculty: "SCIENCE", section: "CS" },
    { batch, faculty: "MANAGEMENT", section: "ECONOMICS" },
    { batch, faculty: "MANAGEMENT", section: "MARKETING" },
  ]);
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

  const teacherAssignments = await prisma.teacherSubjectAssignment.findMany({
    include: {
      subject: { select: { id: true, faculty: true } },
      teacher: { select: { id: true, role: true } },
    },
  });

  if (teacherAssignments.length === 0) {
    throw new Error("No teacher-subject assignments found. Run seed-subjects first.");
  }

  const assignmentByClass = new Map();
  for (const assignment of teacherAssignments) {
    for (const combo of classCombosForAssignment(assignment)) {
      const key = classKey(combo);
      const list = assignmentByClass.get(key) || [];
      list.push({ teacherId: assignment.teacher.id, subjectId: assignment.subject.id });
      assignmentByClass.set(key, list);
    }
  }

  const dates = buildMarchDates();
  const totalDays = dates.length;
  if (totalDays === 0) {
    throw new Error("No March weekdays available for seeding.");
  }

  await prisma.attendance.deleteMany();

  const allIds = students.map((s) => s.id);
  const shuffled = shuffle([...allIds]);
  const fullSet = new Set(shuffled.slice(0, 3));
  const below20Id = shuffled[3];
  const below40Id = shuffled[4];

  for (const student of students) {
    const key = classKey(student);
    const options = assignmentByClass.get(key) || [];
    if (options.length === 0) {
      throw new Error(`No assignment found for class ${key}`);
    }

    const assignment = options[Math.floor(Math.random() * options.length)];

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
          subjectId: assignment.subjectId,
          date,
          present: presentDates.has(date),
        },
      });
    }
  }

  console.log(`Seeded March attendance for ${students.length} students across ${totalDays} weekdays.`);
  console.log("Distribution rules applied: 3 full, 1 below 20%, 1 below 40%, others mostly above 70%.");
}

run()
  .catch((err) => {
    console.error("ERROR", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
