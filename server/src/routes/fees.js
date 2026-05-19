const { Router } = require("express");
const { z } = require("zod");
const { FeeStatus, FeeType, Role } = require("@prisma/client");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { DEFAULT_MONTHLY_FEE } = require("../config");

const router = Router();

const createFeeSchema = z.object({
  body: z.object({
    studentId: z.number().int().positive(),
    title: z.string().min(1),
    amount: z.number().int().positive(),
    dueDate: z.string().optional().nullable(),
  }),
});

const generateMonthlySchema = z.object({
  body: z.object({
    month: z.number().int().min(1).max(12).optional(),
    year: z.number().int().min(2000).optional(),
    amount: z.number().int().positive().optional(),
    title: z.string().min(1).optional(),
    auto: z.boolean().optional(),
  }),
});

const directPaySchema = z.object({
  body: z.object({
    amount: z.preprocess((value) => Number(value), z.number().positive()),
    password: z.string().min(1),
  }),
});

function resolveMonthYear(inputMonth, inputYear) {
  const now = new Date();
  const month = inputMonth || now.getMonth() + 1;
  const year = inputYear || now.getFullYear();
  return { month, year };
}

function getMonthDueDate(year, month) {
  return new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
}

async function getStudentForUser(userId) {
  return prisma.student.findFirst({ where: { userId } });
}

async function generateMonthlyFees({ month, year, amount, title, createdById }) {
  const students = await prisma.student.findMany({
    where: { userId: { not: null } },
    select: { id: true },
  });

  if (students.length === 0) {
    return { created: 0, skipped: 0 };
  }

  const existing = await prisma.fee.findMany({
    where: {
      type: FeeType.MONTHLY,
      billingMonth: month,
      billingYear: year,
      studentId: { in: students.map((s) => s.id) },
    },
    select: { studentId: true },
  });

  const existingSet = new Set(existing.map((row) => row.studentId));
  const toCreate = students.filter((s) => !existingSet.has(s.id));
  if (toCreate.length === 0) {
    return { created: 0, skipped: existingSet.size };
  }

  const dueDate = getMonthDueDate(year, month);
  const feeTitle = title || `Monthly Fee - ${year}-${String(month).padStart(2, "0")}`;
  const data = toCreate.map((s) => ({
    studentId: s.id,
    title: feeTitle,
    amount,
    dueDate,
    status: FeeStatus.PENDING,
    type: FeeType.MONTHLY,
    billingMonth: month,
    billingYear: year,
    createdById,
  }));

  await prisma.fee.createMany({ data, skipDuplicates: true });
  return { created: data.length, skipped: existingSet.size };
}

router.post("/api/fees", requireAuth(Role.ADMIN), validate(createFeeSchema), async (req, res) => {
  const { studentId, title, amount, dueDate } = req.validated.body;
  const parsedDueDate = dueDate ? new Date(dueDate) : null;
  if (dueDate && Number.isNaN(parsedDueDate.getTime())) {
    return res.status(400).json({ ok: false, error: "Invalid dueDate" });
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) {
    return res.status(404).json({ ok: false, error: "Student not found" });
  }

  try {
    const fee = await prisma.fee.create({
      data: {
        studentId,
        title,
        amount,
        dueDate: parsedDueDate,
        type: FeeType.MANUAL,
        createdById: req.user.userId,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            rollNumber: true,
            batch: true,
            faculty: true,
            section: true,
            user: { select: { email: true } },
          },
        },
        createdBy: { select: { id: true, name: true } },
      },
    });
    return res.status(201).json({ ok: true, fee });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Failed to create fee" });
  }
});

router.post(
  "/api/fees/monthly/generate",
  requireAuth(Role.ADMIN),
  validate(generateMonthlySchema),
  async (req, res) => {
    const { month: inputMonth, year: inputYear, amount: inputAmount, title, auto } = req.validated.body;
    const { month, year } = resolveMonthYear(inputMonth, inputYear);

    const amount = Number.isInteger(inputAmount) ? inputAmount : DEFAULT_MONTHLY_FEE;
    if (!Number.isInteger(amount) || amount <= 0) {
      return res.status(400).json({ ok: false, error: "Invalid amount" });
    }

    try {
      const result = await generateMonthlyFees({
        month,
        year,
        amount,
        title,
        createdById: req.user.userId,
      });
      return res.json({ ok: true, ...result, month, year, amount });
    } catch (err) {
      return res.status(500).json({ ok: false, error: "Failed to generate monthly fees" });
    }
  }
);

router.get("/api/fees", requireAuth(Role.ADMIN), async (_req, res) => {
  try {
    const fees = await prisma.fee.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            rollNumber: true,
            batch: true,
            faculty: true,
            section: true,
            user: { select: { email: true } },
          },
        },
        createdBy: { select: { id: true, name: true } },
      },
    });
    return res.json({ ok: true, fees });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Failed to load fees" });
  }
});

router.get("/api/fees/student", requireAuth(Role.STUDENT), async (req, res) => {
  try {
    const student = await getStudentForUser(req.user.userId);
    if (!student) {
      return res.status(404).json({ ok: false, error: "Student profile not found" });
    }

    const fees = await prisma.fee.findMany({
      where: { studentId: student.id },
      orderBy: [{ createdAt: "desc" }],
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    return res.json({ ok: true, fees });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Failed to load fees" });
  }
});

router.get("/api/fees/:id", requireAuth(Role.STUDENT), async (req, res) => {
  const feeId = Number(req.params.id);
  if (!Number.isInteger(feeId)) {
    return res.status(400).json({ ok: false, error: "Invalid fee id" });
  }

  try {
    const student = await getStudentForUser(req.user.userId);
    if (!student) {
      return res.status(404).json({ ok: false, error: "Student profile not found" });
    }

    const fee = await prisma.fee.findUnique({
      where: { id: feeId },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    if (!fee || fee.studentId !== student.id) {
      return res.status(404).json({ ok: false, error: "Fee not found" });
    }
    return res.json({ ok: true, fee, student });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Failed to load fee" });
  }
});

router.post(
  "/api/fees/:id/direct-pay",
  requireAuth(Role.STUDENT),
  validate(directPaySchema),
  async (req, res) => {
    const feeId = Number(req.params.id);
    if (!Number.isInteger(feeId)) {
      return res.status(400).json({ ok: false, error: "Invalid fee id" });
    }

    const { amount, password } = req.validated.body;

    try {
      const student = await getStudentForUser(req.user.userId);
      if (!student) {
        return res.status(404).json({ ok: false, error: "Student profile not found" });
      }

      const fee = await prisma.fee.findUnique({ where: { id: feeId } });
      if (!fee || fee.studentId !== student.id) {
        return res.status(404).json({ ok: false, error: "Fee not found" });
      }

      if (fee.status === FeeStatus.PAID) {
        return res.status(400).json({ ok: false, error: "Fee already paid" });
      }

      if (amount !== fee.amount) {
        return res.status(400).json({ ok: false, error: "Amount must match the fee" });
      }

      if (password !== "kat") {
        return res.status(400).json({ ok: false, error: "Invalid password" });
      }

      const paid = await prisma.fee.update({
        where: { id: feeId },
        data: {
          status: FeeStatus.PAID,
          paidAt: new Date(),
          paymentRef: `DIRECT-${Date.now()}`,
          paymentProvider: "DIRECT",
          paymentStatus: "Completed",
          paymentTransactionId: null,
        },
      });

      return res.json({ ok: true, fee: paid });
    } catch (err) {
      return res.status(500).json({ ok: false, error: "Failed to process payment" });
    }
  }
);

module.exports = router;
