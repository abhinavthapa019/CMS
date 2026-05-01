const { Router } = require("express");
const { requireAuth } = require("../middlewares/auth");
const { prisma } = require("../lib/prisma");
const { Role } = require("@prisma/client");

const router = Router();

// Create a notice. Admin only.
router.post("/api/notices", requireAuth(Role.ADMIN), async (req, res) => {
  const { title, body, scope, batch, faculty, section, recipientIds } = req.body || {};
  if (!title || !body || !scope) return res.status(400).json({ ok: false, error: "Missing fields" });
  if (scope === "CLASS" && (!batch || !faculty || !section)) {
    return res.status(400).json({ ok: false, error: "batch, faculty, section are required for CLASS" });
  }

  try {
    const notice = await prisma.notice.create({
      data: {
        title,
        body,
        scope,
        batch: batch || null,
        faculty: faculty || null,
        section: section || null,
        authorId: req.user.userId,
      },
    });

    let userIds = [];

    if (scope === "ALL") {
      const users = await prisma.user.findMany({ where: { role: { in: [Role.STUDENT, Role.TEACHER] } }, select: { id: true } });
      userIds = users.map((u) => u.id);
    } else if (scope === "CLASS") {
      // find students in class and map to their user accounts
      const students = await prisma.student.findMany({ where: { batch, faculty, section }, select: { userId: true } });
      userIds = students.map((s) => s.userId).filter(Boolean);

      // also notify the assigned class teacher (if any)
      const assignment = await prisma.classTeacherAssignment.findUnique({
        where: { batch_faculty_section: { batch, faculty, section } },
        select: { teacherId: true },
      });
      if (assignment?.teacherId) userIds.push(assignment.teacherId);
    } else if (scope === "INDIVIDUAL") {
      if (!Array.isArray(recipientIds)) return res.status(400).json({ ok: false, error: "recipientIds required for INDIVIDUAL" });
      userIds = recipientIds.map((v) => Number(v)).filter(Boolean);
    }

    if (userIds.length > 0) {
      const unique = [...new Set(userIds)];
      await prisma.noticeRecipient.createMany({ data: unique.map((uid) => ({ noticeId: notice.id, userId: uid })), skipDuplicates: true });
    }

    return res.status(201).json({ ok: true, noticeId: notice.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Failed to create notice" });
  }
});

// Admin: get past notices (history)
router.get("/api/notices/admin", requireAuth(Role.ADMIN), async (req, res) => {
  try {
    const notices = await prisma.notice.findMany({
      take: 200,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        author: { select: { id: true, name: true, email: true } },
        recipients: { select: { read: true } },
        _count: { select: { recipients: true } },
      },
    });

    const payload = notices.map((n) => {
      const recipientsCount = n._count?.recipients || 0;
      const readCount = (n.recipients || []).reduce((acc, r) => acc + (r.read ? 1 : 0), 0);
      return {
        id: n.id,
        title: n.title,
        body: n.body,
        scope: n.scope,
        batch: n.batch,
        faculty: n.faculty,
        section: n.section,
        createdAt: n.createdAt,
        author: n.author,
        recipientsCount,
        readCount,
      };
    });

    return res.json({ ok: true, notices: payload });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Failed to fetch admin notices" });
  }
});

// Get notices for current user
router.get("/api/notices", requireAuth(), async (req, res) => {
  try {
    const recs = await prisma.noticeRecipient.findMany({
      where: { userId: req.user.userId },
      include: { notice: { include: { author: { select: { id: true, name: true, email: true } } } } },
      orderBy: { id: "desc" },
    });
    const payload = recs.map((r) => ({ id: r.notice.id, title: r.notice.title, body: r.notice.body, scope: r.notice.scope, createdAt: r.notice.createdAt, author: r.notice.author, read: r.read, readAt: r.readAt }));
    return res.json({ ok: true, notices: payload });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Failed to fetch notices" });
  }
});

// Mark notice as read
router.post("/api/notices/:id/read", requireAuth(), async (req, res) => {
  const noticeId = Number(req.params.id);
  if (!Number.isInteger(noticeId)) return res.status(400).json({ ok: false, error: "Invalid id" });
  try {
    const rec = await prisma.noticeRecipient.findUnique({ where: { noticeId_userId: { noticeId, userId: req.user.userId } } });
    if (!rec) return res.status(404).json({ ok: false, error: "Notice not found for user" });
    const updated = await prisma.noticeRecipient.update({ where: { id: rec.id }, data: { read: true, readAt: new Date() } });
    return res.json({ ok: true, updated: !!updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Failed to mark read" });
  }
});

module.exports = router;
