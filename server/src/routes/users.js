const { Router } = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const { AcademicBatch, Role } = require("@prisma/client");
const { prisma } = require("../lib/prisma");
const { userSelect } = require("../constants/userSelect");
const { requireAuth } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");

const router = Router();

const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.literal(Role.TEACHER).optional().default(Role.TEACHER),
    subjectAssignments: z
      .array(
        z.object({
          subjectId: z.number().int().positive(),
          batch: z.nativeEnum(AcademicBatch).nullable().optional(),
        })
      )
      .optional()
      .default([]),
  }),
});

const updateUserSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6).optional(),
    subjectAssignments: z
      .array(
        z.object({
          subjectId: z.number().int().positive(),
          batch: z.nativeEnum(AcademicBatch).nullable().optional(),
        })
      )
      .optional()
      .default([]),
  }),
});

router.post("/api/users", requireAuth(Role.ADMIN), validate(createUserSchema), async (req, res) => {
  const { name, email, password, role, subjectAssignments } = req.validated.body;
  if (role !== Role.TEACHER) {
    return res.status(400).json({ ok: false, error: "Only TEACHER registration is allowed" });
  }

  const uniqueAssignments = new Map();
  for (const a of subjectAssignments || []) {
    const key = `${a.subjectId}:${a.batch || "ALL"}`;
    uniqueAssignments.set(key, { subjectId: a.subjectId, batch: a.batch ?? null });
  }

  if (uniqueAssignments.size > 0) {
    const subjects = await prisma.subject.findMany({
      where: { id: { in: [...uniqueAssignments.values()].map((a) => a.subjectId) } },
      select: { id: true },
    });
    if (subjects.length !== uniqueAssignments.size) {
      return res.status(400).json({ ok: false, error: "One or more subject assignments are invalid" });
    }
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name, email, password: hashed, role },
        select: userSelect,
      });

      if (uniqueAssignments.size > 0) {
        await tx.teacherSubjectAssignment.createMany({
          data: [...uniqueAssignments.values()].map((a) => ({
            teacherId: created.id,
            subjectId: a.subjectId,
            batch: a.batch,
          })),
        });
      }

      return created;
    });

    return res.status(201).json({ ok: true, user });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ ok: false, error: "Email already exists" });
    }
    return res.status(500).json({ ok: false, error: "Failed to create user" });
  }
});

router.get("/api/users", requireAuth(Role.ADMIN), async (req, res) => {
  const users = await prisma.user.findMany({ select: userSelect });
  return res.json({ ok: true, users });
});

router.put("/api/users/:id", requireAuth(Role.ADMIN), validate(updateUserSchema), async (req, res) => {
  const userId = Number(req.validated.params.id);
  if (!Number.isInteger(userId)) {
    return res.status(400).json({ ok: false, error: "Invalid user id" });
  }

  const { name, email, password, subjectAssignments } = req.validated.body;
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    return res.status(404).json({ ok: false, error: "User not found" });
  }
  if (existing.role !== Role.TEACHER) {
    return res.status(400).json({ ok: false, error: "Only TEACHER accounts can be edited here" });
  }

  const uniqueAssignments = new Map();
  for (const a of subjectAssignments || []) {
    const key = `${a.subjectId}:${a.batch || "ALL"}`;
    uniqueAssignments.set(key, { subjectId: a.subjectId, batch: a.batch ?? null });
  }

  if (uniqueAssignments.size > 0) {
    const subjects = await prisma.subject.findMany({
      where: { id: { in: [...uniqueAssignments.values()].map((a) => a.subjectId) } },
      select: { id: true },
    });
    if (subjects.length !== uniqueAssignments.size) {
      return res.status(400).json({ ok: false, error: "One or more subject assignments are invalid" });
    }
  }

  try {
    const user = await prisma.$transaction(async (tx) => {
      const updateData = {
        name,
        email,
      };
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: updateData,
        select: userSelect,
      });

      await tx.teacherSubjectAssignment.deleteMany({ where: { teacherId: userId } });
      if (uniqueAssignments.size > 0) {
        await tx.teacherSubjectAssignment.createMany({
          data: [...uniqueAssignments.values()].map((a) => ({
            teacherId: userId,
            subjectId: a.subjectId,
            batch: a.batch,
          })),
        });
      }

      return updated;
    });

    return res.json({ ok: true, user });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ ok: false, error: "Email already exists" });
    }
    return res.status(500).json({ ok: false, error: "Failed to update user" });
  }
});

router.delete("/api/users/:id", requireAuth(Role.ADMIN), async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) {
    return res.status(400).json({ ok: false, error: "Invalid user id" });
  }

  if (req.user.userId === userId) {
    return res.status(400).json({ ok: false, error: "You cannot delete your own account" });
  }

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    return res.status(404).json({ ok: false, error: "User not found" });
  }

  try {
    const createdAssignments = await prisma.assignment.findMany({
      where: { createdById: userId },
      select: { id: true },
    });
    const assignmentIds = createdAssignments.map((a) => a.id);

    await prisma.$transaction([
      prisma.classTeacherAssignment.deleteMany({ where: { teacherId: userId } }),
      prisma.teacherSubjectAssignment.deleteMany({ where: { teacherId: userId } }),
      prisma.noticeRecipient.deleteMany({ where: { userId } }),
      prisma.notice.deleteMany({ where: { authorId: userId } }),
      prisma.assignmentSubmission.deleteMany({
        where: assignmentIds.length > 0 ? { assignmentId: { in: assignmentIds } } : { assignmentId: -1 },
      }),
      prisma.assignment.deleteMany({ where: { createdById: userId } }),
      prisma.attendance.deleteMany({ where: { teacherId: userId } }),
      prisma.mark.deleteMany({ where: { teacherId: userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);
    return res.json({ ok: true, deletedUserId: userId });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Failed to delete user" });
  }
});

module.exports = router;
