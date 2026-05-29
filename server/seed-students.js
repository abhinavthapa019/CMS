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

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function sampleTravelTime() {
  const edgePool = [1, 4, 5, 10, 30, 60, 90];
  if (Math.random() < 0.25) return pickRandom(edgePool);
  return randInt(1, 4);
}

function clampFloat(value, min, max, decimals = 1) {
  const n = Math.min(Math.max(value, min), max);
  const pow = 10 ** decimals;
  return Math.round(n * pow) / pow;
}

function sampleHistoricalScores() {
  const tierRoll = Math.random();
  const base = tierRoll < 0.2 ? randInt(50, 62)
    : tierRoll < 0.55 ? randInt(63, 78)
      : randInt(79, 94);
  const drift = () => randInt(-4, 5);
  const grade8 = clampFloat(base + drift(), 35, 98);
  const grade9 = clampFloat(grade8 + drift(), 35, 98);
  const grade10 = clampFloat(grade9 + drift(), 35, 98);
  return { grade8Score: grade8, grade9Score: grade9, grade10Score: grade10 };
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
    prisma.fee.deleteMany(),
    prisma.student.deleteMany(),
  ]);

  for (const cls of classes) {
    for (let i = 1; i <= 10; i += 1) {
      const firstName = pickRandom(firstNames);
      const lastName = pickRandom(lastNames);
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
          ...sampleHistoricalScores(),
          motherJob: pickRandom(jobs),
          fatherJob: pickRandom(jobs),
          travelTime: sampleTravelTime(),
        },
      });

      // Create a linked User account for every student.
      const classCode = cls.code.toLowerCase();
      const email = `s${classCode}${rollNumber}@students.local`;
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
  }

  console.log("Reset and seeded exactly 80 students across 8 classes (roll 1..10 in each class).");
  console.log("Student demo login: password=student123 (all students). Email format: s<classcode><roll>@students.local");
}

run()
  .catch((err) => {
    console.error("ERROR", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
