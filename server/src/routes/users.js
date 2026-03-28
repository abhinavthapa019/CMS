const { Router } = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const { Role } = require("@prisma/client");
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
    role: z.nativeEnum(Role).optional().default(Role.TEACHER),
  }),
});

router.post("/api/users", requireAuth(Role.ADMIN), validate(createUserSchema), async (req, res) => {
  const { name, email, password, role } = req.validated.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role },
      select: userSelect,
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
    await prisma.$transaction([
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
