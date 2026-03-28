const { PrismaClient } = require("@prisma/client");

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
  await prisma.$transaction([
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

      await prisma.student.create({
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

      globalCounter += 1;
    }
  }

  console.log("Reset and seeded exactly 80 students across 8 classes (roll 1..10 in each class).");
}

run()
  .catch((err) => {
    console.error("ERROR", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
