const { PrismaClient, FeeStatus, FeeType, Role } = require("@prisma/client");
const { DEFAULT_MONTHLY_FEE } = require("./src/config");

const prisma = new PrismaClient();

const BILLING_YEAR = 2026;
const LAST_PAID_MONTH = 5;

function monthDueDate(year, month) {
  return new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
}

function monthPaidAt(year, month) {
  return new Date(Date.UTC(year, month - 1, 15, 12, 0, 0, 0));
}

async function run() {
  const [admin, students] = await Promise.all([
    prisma.user.findFirst({ where: { role: Role.ADMIN }, select: { id: true } }),
    prisma.student.findMany({ select: { id: true }, orderBy: { id: "asc" } }),
  ]);

  if (!admin) {
    throw new Error("No ADMIN user found. Run seed-admin first.");
  }

  if (students.length === 0) {
    throw new Error("No students found. Run seed-students first.");
  }

  let created = 0;

  for (let month = 1; month <= LAST_PAID_MONTH; month += 1) {
    const dueDate = monthDueDate(BILLING_YEAR, month);
    const paidAt = monthPaidAt(BILLING_YEAR, month);
    const title = `Monthly Fee - ${BILLING_YEAR}-${String(month).padStart(2, "0")}`;

    const data = students.map((s) => ({
      studentId: s.id,
      title,
      amount: DEFAULT_MONTHLY_FEE,
      dueDate,
      status: FeeStatus.PAID,
      type: FeeType.MONTHLY,
      billingMonth: month,
      billingYear: BILLING_YEAR,
      paidAt,
      paymentRef: `SEED-${BILLING_YEAR}-${month}-${s.id}`,
      paymentProvider: "SEED",
      paymentStatus: "Completed",
      paymentTransactionId: null,
      createdById: admin.id,
    }));

    const result = await prisma.fee.createMany({ data, skipDuplicates: true });
    created += result.count || 0;

    await prisma.fee.updateMany({
      where: {
        type: FeeType.MONTHLY,
        billingYear: BILLING_YEAR,
        billingMonth: month,
      },
      data: {
        status: FeeStatus.PAID,
        paidAt,
        paymentRef: `SEED-${BILLING_YEAR}-${month}`,
        paymentProvider: "SEED",
        paymentStatus: "Completed",
        paymentTransactionId: null,
      },
    });
  }

  console.log(`Seeded/updated paid monthly fees for months 1-${LAST_PAID_MONTH} (${BILLING_YEAR}). New rows: ${created}.`);
}

run()
  .catch((err) => {
    console.error("ERROR", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
