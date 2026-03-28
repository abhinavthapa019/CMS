const { Router } = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const { prisma } = require("../lib/prisma");
const { userSelect } = require("../constants/userSelect");
const { issueToken, requireAuth } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");

const router = Router();

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }),
});

router.post("/api/auth/login", validate(loginSchema), async (req, res) => {
  const { email, password } = req.validated.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ ok: false, error: "Invalid credentials" });
  }
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(401).json({ ok: false, error: "Invalid credentials" });
  }
  const token = issueToken(user);
  return res.json({ ok: true, token, user: { ...user, password: undefined } });
});

router.get("/api/auth/me", requireAuth(), async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: userSelect,
  });
  if (!user) return res.status(404).json({ ok: false, error: "User not found" });
  return res.json({ ok: true, user });
});

module.exports = router;
