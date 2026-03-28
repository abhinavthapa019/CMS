const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const subjects = [
  { name: "English", faculty: "SCIENCE", isOptional: false },
  { name: "English", faculty: "MANAGEMENT", isOptional: false },
  { name: "Nepali", faculty: null, isOptional: false },
  { name: "Mathematics", faculty: null, isOptional: false },
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
    "sanjay.gurung@campus.local",
    "anita.shrestha@campus.local",
    "bikash.karki@campus.local",
    "prakash.thapa@campus.local",
    "nirmala.rai@campus.local",
    "roshan.lama@campus.local",
    "manisha.poudel@campus.local",
    "deepak.adhikari@campus.local",
    "sarita.kc@campus.local",
    "kamal.bhattarai@campus.local",
    "binita.rana@campus.local",
    "prabin.malla@campus.local",
    "sabina.dhakal@campus.local",
  ];

  for (const email of requiredTeachers) {
    if (!teacherByEmail[email]) {
      throw new Error(`Missing teacher ${email}. Run npm run seed-teachers first.`);
    }
  }

  const chemistryBatches = Math.random() < 0.5 ? ["ELEVEN", "TWELVE"] : ["TWELVE", "ELEVEN"];
  const accountBatches = Math.random() < 0.5 ? ["ELEVEN", "TWELVE"] : ["TWELVE", "ELEVEN"];

  const plan = [
    // 1 Nepali teacher for all 8 classes
    { teacher: "sanjay.gurung@campus.local", subject: "Nepali:COMMON", batch: null },

    // 2 English teachers by faculty
    { teacher: "anita.shrestha@campus.local", subject: "English:SCIENCE", batch: null },
    { teacher: "bikash.karki@campus.local", subject: "English:MANAGEMENT", batch: null },

    // Same teacher handles both 11 and 12 for these subjects
    { teacher: "prakash.thapa@campus.local", subject: "Physics:SCIENCE", batch: null },
    { teacher: "nirmala.rai@campus.local", subject: "Biology:SCIENCE", batch: null },
    { teacher: "roshan.lama@campus.local", subject: "Computer Science:SCIENCE", batch: null },
    { teacher: "manisha.poudel@campus.local", subject: "Business Studies:MANAGEMENT", batch: null },
    { teacher: "deepak.adhikari@campus.local", subject: "Economics:MANAGEMENT", batch: null },
    { teacher: "sarita.kc@campus.local", subject: "Marketing:MANAGEMENT", batch: null },
    { teacher: "sanjay.gurung@campus.local", subject: "Mathematics:COMMON", batch: null },

    // Chemistry split between 2 teachers (random 11/12 division)
    { teacher: "kamal.bhattarai@campus.local", subject: "Chemistry:SCIENCE", batch: chemistryBatches[0] },
    { teacher: "binita.rana@campus.local", subject: "Chemistry:SCIENCE", batch: chemistryBatches[1] },

    // Accounting split between 2 teachers (random 11/12 division)
    { teacher: "prabin.malla@campus.local", subject: "Accountancy:MANAGEMENT", batch: accountBatches[0] },
    { teacher: "sabina.dhakal@campus.local", subject: "Accountancy:MANAGEMENT", batch: accountBatches[1] },
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

  console.log("Seeded requested subject assignment model.");
}

run()
  .catch((e) => {
    console.error("ERROR", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
