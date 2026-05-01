const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const classes = [
  { batch: "ELEVEN", faculty: "SCIENCE", section: "BIO", code: "11SB" },
  { batch: "ELEVEN", faculty: "SCIENCE", section: "CS", code: "11SC" },
  { batch: "ELEVEN", faculty: "MANAGEMENT", section: "ECONOMICS", code: "11ME" },
  { batch: "ELEVEN", faculty: "MANAGEMENT", section: "MARKETING", code: "11MM" },
  { batch: "TWELVE", faculty: "SCIENCE", section: "BIO", code: "12SB" },
  { batch: "TWELVE", faculty: "SCIENCE", section: "CS", code: "12SC" },
  { batch: "TWELVE", faculty: "MANAGEMENT", section: "ECONOMICS", code: "12ME" },
  { batch: "TWELVE", faculty: "MANAGEMENT", section: "MARKETING", code: "12MM" },
];

const firstNames = [
  "Aarav",
  "Sita",
  "Rohan",
  "Anisha",
  "Niraj",
  "Pooja",
  "Suman",
  "Pratik",
  "Sneha",
  "Bikash",
  "Roshan",
  "Kabita",
  "Aayush",
  "Nisha",
  "Sajal",
  "Asmita",
  "Sujan",
  "Ritika",
  "Manish",
  "Tara",
  "Emma",
  "Liam",
  "Olivia",
  "Noah",
  "Maya",
  "Aiden",
  "Sophia",
  "Ethan",
  "Grace",
  "Elijah",
];

const lastNames = [
  "Shrestha",
  "Gurung",
  "Karki",
  "Adhikari",
  "Thapa",
  "Rai",
  "Lama",
  "Bhandari",
  "Acharya",
  "Poudel",
  "Maharjan",
  "Khadka",
  "KC",
  "Tamang",
  "Basnet",
  "Rana",
  "Pradhan",
  "Dhakal",
  "Bhattarai",
  "Malla",
  "Smith",
  "Wilson",
  "Brown",
  "Taylor",
];

const jobs = ["teacher", "services", "health", "at_home", "other"];

function pick(arr, idx) {
  return arr[idx % arr.length];
}

async function run() {
  // Clean student-linked data first so reseeding is repeatable.
  // Note: we only delete student demo users under @students.local to avoid touching real accounts.
  const demoStudentUsers = await prisma.user.findMany({
    where: { role: "STUDENT", email: { endsWith: "@students.local" } },
    select: { id: true },
  });
  const demoStudentUserIds = demoStudentUsers.map((u) => u.id);

  await prisma.$transaction([
    prisma.noticeRecipient.deleteMany({ where: { userId: { in: demoStudentUserIds } } }),
    prisma.user.deleteMany({ where: { id: { in: demoStudentUserIds } } }),
    prisma.assignmentSubmission.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.mark.deleteMany(),
    prisma.prediction.deleteMany(),
    prisma.student.deleteMany(),
  ]);

  let globalCounter = 0;

  for (const cls of classes) {
    for (let i = 1; i <= 10; i += 1) {
      const firstName = pick(firstNames, globalCounter + i);
      const lastName = pick(lastNames, globalCounter * 2 + i);
      const rollNumber = String(i);

      // create student record
      const student = await prisma.student.create({
        data: {
          firstName,
          lastName,
          rollNumber,
          batch: cls.batch,
          faculty: cls.faculty,
          section: cls.section,
          motherJob: pick(jobs, globalCounter + i),
          fatherJob: pick(jobs, globalCounter + i + 1),
          travelTime: (i % 5) + 1,
        },
      });

      // For ELEVEN SCIENCE students, also create a linked User account (student actor)
      if (cls.batch === "ELEVEN" && cls.faculty === "SCIENCE") {
        // create a simple email: firstname.lastname<roll>@students.local to keep uniqueness
        const local = `${firstName}.${lastName}${i}`.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9.]/g, "");
        const email = `${local}@students.local`;
        const password = "student123";
        const hashed = await bcrypt.hash(password, 10);

        const user = await prisma.user.upsert({
          where: { email },
          create: {
            name: `${firstName} ${lastName}`,
            email,
            password: hashed,
            role: "STUDENT",
          },
          update: {},
        });

        // link student -> user
        await prisma.student.update({ where: { id: student.id }, data: { userId: user.id } });
      }

      globalCounter += 1;
    }
  }

  console.log("Reset and seeded exactly 80 students across 8 classes (roll 1..10 in each class).");
  console.log(
    "Student demo login: password=student123 (only ELEVEN SCIENCE). Email format: firstname.lastname1@students.local"
  );
}

run()
  .catch((err) => {
    console.error("ERROR", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
