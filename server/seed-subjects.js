const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const subjects = [
  { name: "English", faculty: "SCIENCE", isOptional: false },
  { name: "English", faculty: "MANAGEMENT", isOptional: false },
  { name: "Nepali", faculty: "SCIENCE", isOptional: false },
  { name: "Nepali", faculty: "MANAGEMENT", isOptional: false },
  { name: "Mathematics", faculty: "SCIENCE", isOptional: false },
  { name: "Mathematics", faculty: "MANAGEMENT", isOptional: false },
  { name: "Physics", faculty: "SCIENCE", isOptional: false },
  { name: "Chemistry", faculty: "SCIENCE", isOptional: false },
  { name: "Computer Science", faculty: "SCIENCE", isOptional: false },
  { name: "Biology", faculty: "SCIENCE", isOptional: true },
  { name: "Accountancy", faculty: "MANAGEMENT", isOptional: false },
  { name: "Business Studies", faculty: "MANAGEMENT", isOptional: false },
  { name: "Economics", faculty: "MANAGEMENT", isOptional: true },
  { name: "Marketing", faculty: "MANAGEMENT", isOptional: true },
];

async function run() {
  await prisma.teacherSubjectAssignment.deleteMany();
  await prisma.classTeacherAssignment.deleteMany();

  await prisma.subject.deleteMany({
    where: {
      faculty: null,
      name: { in: ["Nepali", "Mathematics"] },
    },
  });

  for (const subject of subjects) {
    const existing = await prisma.subject.findFirst({
      where: {
        name: subject.name,
        faculty: subject.faculty,
      },
    });

    if (existing) {
      await prisma.subject.update({
        where: { id: existing.id },
        data: {
          isOptional: subject.isOptional,
        },
      });
    } else {
      await prisma.subject.create({
        data: subject,
      });
    }

    console.log("upserted", subject.name, subject.faculty || "COMMON");
  }

  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER" },
    select: { id: true, email: true },
  });
  const subjectsDb = await prisma.subject.findMany();

  const teacherByEmail = Object.fromEntries(teachers.map((t) => [t.email, t]));
  const subjectByKey = Object.fromEntries(subjectsDb.map((s) => [`${s.name}:${s.faculty || "COMMON"}`, s]));

  const requiredTeachers = [
    "sushil.adhikari@campus.local",
    "rojina.karki@campus.local",
    "bikram.shrestha@campus.local",
    "dipesh.poudel@campus.local",
    "anjana.rai@campus.local",
    "kiran.bhandari@campus.local",
    "sarita.khadka@campus.local",
    "prabin.koirala@campus.local",
    "sagar.bhattarai@campus.local",
    "manisha.thapa@campus.local",
    "kamal.gurung@campus.local",
    "nisha.acharya@campus.local",
    "ramesh.oli@campus.local",
    "pooja.basnet@campus.local",
    "roshan.lama@campus.local",
    "binita.nepal@campus.local",
    "sabina.kafle@campus.local",
    "pratima.gautam@campus.local",
  ];

  for (const email of requiredTeachers) {
    if (!teacherByEmail[email]) {
      throw new Error(`Missing teacher ${email}. Run npm run seed-teachers first.`);
    }
  }

  const plan = [
    // English teachers visible in both departments.
    { teacher: "roshan.lama@campus.local", subject: "English:SCIENCE", batch: null },
    { teacher: "roshan.lama@campus.local", subject: "English:MANAGEMENT", batch: null },
    { teacher: "binita.nepal@campus.local", subject: "English:SCIENCE", batch: "ELEVEN" },
    { teacher: "binita.nepal@campus.local", subject: "English:MANAGEMENT", batch: "TWELVE" },

    // Nepali teachers visible in both departments.
    { teacher: "sabina.kafle@campus.local", subject: "Nepali:SCIENCE", batch: null },
    { teacher: "sabina.kafle@campus.local", subject: "Nepali:MANAGEMENT", batch: null },
    { teacher: "ramesh.oli@campus.local", subject: "Nepali:SCIENCE", batch: "ELEVEN" },
    { teacher: "ramesh.oli@campus.local", subject: "Nepali:MANAGEMENT", batch: "TWELVE" },

    // Mathematics in both departments with 3 teachers for science and 3 for management.
    { teacher: "sushil.adhikari@campus.local", subject: "Mathematics:SCIENCE", batch: "ELEVEN" },
    { teacher: "rojina.karki@campus.local", subject: "Mathematics:SCIENCE", batch: "TWELVE" },
    { teacher: "bikram.shrestha@campus.local", subject: "Mathematics:SCIENCE", batch: null },
    { teacher: "pratima.gautam@campus.local", subject: "Mathematics:MANAGEMENT", batch: "ELEVEN" },
    { teacher: "kamal.gurung@campus.local", subject: "Mathematics:MANAGEMENT", batch: "TWELVE" },
    { teacher: "bikram.shrestha@campus.local", subject: "Mathematics:MANAGEMENT", batch: null },

    // Physics: separate teachers by batch + one across both batches.
    { teacher: "dipesh.poudel@campus.local", subject: "Physics:SCIENCE", batch: "ELEVEN" },
    { teacher: "anjana.rai@campus.local", subject: "Physics:SCIENCE", batch: "TWELVE" },
    { teacher: "kiran.bhandari@campus.local", subject: "Physics:SCIENCE", batch: null },

    // Chemistry: separate teachers by batch + one across both batches.
    { teacher: "sarita.khadka@campus.local", subject: "Chemistry:SCIENCE", batch: "ELEVEN" },
    { teacher: "prabin.koirala@campus.local", subject: "Chemistry:SCIENCE", batch: "TWELVE" },
    { teacher: "sagar.bhattarai@campus.local", subject: "Chemistry:SCIENCE", batch: null },

    // Management core with realistic overlap.
    { teacher: "manisha.thapa@campus.local", subject: "Accountancy:MANAGEMENT", batch: "ELEVEN" },
    { teacher: "kamal.gurung@campus.local", subject: "Accountancy:MANAGEMENT", batch: "TWELVE" },
    { teacher: "pratima.gautam@campus.local", subject: "Accountancy:MANAGEMENT", batch: null },
    { teacher: "nisha.acharya@campus.local", subject: "Economics:MANAGEMENT", batch: "ELEVEN" },
    { teacher: "pooja.basnet@campus.local", subject: "Economics:MANAGEMENT", batch: "TWELVE" },
    { teacher: "ramesh.oli@campus.local", subject: "Economics:MANAGEMENT", batch: null },

    // Additional domain subjects.
    { teacher: "manisha.thapa@campus.local", subject: "Business Studies:MANAGEMENT", batch: null },
    { teacher: "nisha.acharya@campus.local", subject: "Marketing:MANAGEMENT", batch: null },
    { teacher: "roshan.lama@campus.local", subject: "Computer Science:SCIENCE", batch: null },
    { teacher: "anjana.rai@campus.local", subject: "Biology:SCIENCE", batch: null },
  ];

  for (const row of plan) {
    const teacher = teacherByEmail[row.teacher];
    const subject = subjectByKey[row.subject];
    if (!subject) {
      throw new Error(`Missing subject ${row.subject}`);
    }
    await prisma.teacherSubjectAssignment.create({
      data: {
        teacherId: teacher.id,
        subjectId: subject.id,
        batch: row.batch,
      },
    });
  }

  const classTeacherPlan = [
    { teacher: "dipesh.poudel@campus.local", batch: "ELEVEN", faculty: "SCIENCE", section: "BIO" },
    { teacher: "kiran.bhandari@campus.local", batch: "ELEVEN", faculty: "SCIENCE", section: "CS" },
    { teacher: "manisha.thapa@campus.local", batch: "ELEVEN", faculty: "MANAGEMENT", section: "ECONOMICS" },
    { teacher: "nisha.acharya@campus.local", batch: "ELEVEN", faculty: "MANAGEMENT", section: "MARKETING" },
    { teacher: "anjana.rai@campus.local", batch: "TWELVE", faculty: "SCIENCE", section: "BIO" },
    { teacher: "sagar.bhattarai@campus.local", batch: "TWELVE", faculty: "SCIENCE", section: "CS" },
    { teacher: "kamal.gurung@campus.local", batch: "TWELVE", faculty: "MANAGEMENT", section: "ECONOMICS" },
    { teacher: "pratima.gautam@campus.local", batch: "TWELVE", faculty: "MANAGEMENT", section: "MARKETING" },
  ];

  for (const row of classTeacherPlan) {
    const teacher = teacherByEmail[row.teacher];
    await prisma.classTeacherAssignment.create({
      data: {
        teacherId: teacher.id,
        batch: row.batch,
        faculty: row.faculty,
        section: row.section,
      },
    });
  }

  console.log("Seeded subject assignments and class teacher assignments.");
}

run()
  .catch((e) => {
    console.error("ERROR", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
