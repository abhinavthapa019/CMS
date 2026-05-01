const fs = require("fs");
const path = require("path");
const { Router } = require("express");
const multer = require("multer");
const { AcademicBatch, Faculty, Role, Section } = require("@prisma/client");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middlewares/auth");

const router = Router();

const uploadsDir = path.join(__dirname, "../../uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const base = path.basename(file.originalname || "file", ext).replace(/[^a-zA-Z0-9-_]/g, "");
    cb(null, `${Date.now()}-${base || "file"}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

function isValidClass(batch, faculty, section) {
  return (
    Object.values(AcademicBatch).includes(batch) &&
    Object.values(Faculty).includes(faculty) &&
    Object.values(Section).includes(section)
  );
}

function assignmentSelectForList() {
  return {
    id: true,
    title: true,
    description: true,
    dueDate: true,
    batch: true,
    faculty: true,
    section: true,
    attachmentUrl: true,
    attachmentName: true,
    createdAt: true,
    createdBy: { select: { id: true, name: true, email: true } },
    _count: { select: { submissions: true } },
  };
}

router.post("/api/assignments", requireAuth(), upload.single("attachment"), async (req, res) => {
  if (req.user.role !== Role.TEACHER && req.user.role !== Role.ADMIN) {
    return res.status(403).json({ ok: false, error: "Only teachers/admin can create assignments" });
  }

  const { title, description, dueDate, batch, faculty, section } = req.body || {};
  if (!title || !batch || !faculty || !section) {
    return res.status(400).json({ ok: false, error: "title, batch, faculty, section are required" });
  }

  if (!isValidClass(batch, faculty, section)) {
    return res.status(400).json({ ok: false, error: "Invalid class fields" });
  }

  let parsedDueDate = null;
  if (dueDate) {
    parsedDueDate = new Date(dueDate);
    if (Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({ ok: false, error: "Invalid dueDate" });
    }
  }

  try {
    const created = await prisma.assignment.create({
      data: {
        title,
        description: description || null,
        dueDate: parsedDueDate,
        batch,
        faculty,
        section,
        attachmentUrl: req.file ? `/uploads/${req.file.filename}` : null,
        attachmentName: req.file ? req.file.originalname : null,
        createdById: req.user.userId,
      },
      select: assignmentSelectForList(),
    });

    return res.status(201).json({ ok: true, assignment: created });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Failed to create assignment" });
  }
});

router.get("/api/assignments/teacher", requireAuth(), async (req, res) => {
  if (req.user.role !== Role.TEACHER && req.user.role !== Role.ADMIN) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  try {
    const where = req.user.role === Role.ADMIN ? {} : { createdById: req.user.userId };
    const assignments = await prisma.assignment.findMany({
      where,
      select: assignmentSelectForList(),
      orderBy: [{ createdAt: "desc" }],
    });
    return res.json({ ok: true, assignments });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Failed to load assignments" });
  }
});

router.get("/api/assignments/student", requireAuth(Role.STUDENT), async (req, res) => {
  try {
    const student = await prisma.student.findFirst({ where: { userId: req.user.userId } });
    if (!student) {
      return res.status(404).json({ ok: false, error: "Student profile not found" });
    }

    const assignments = await prisma.assignment.findMany({
      where: {
        batch: student.batch,
        faculty: student.faculty,
        section: student.section,
      },
      orderBy: [{ createdAt: "desc" }],
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        submissions: {
          where: { studentId: student.id },
          select: {
            id: true,
            note: true,
            attachmentUrl: true,
            attachmentName: true,
            submittedAt: true,
            updatedAt: true,
          },
        },
      },
    });

    const payload = assignments.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      dueDate: a.dueDate,
      batch: a.batch,
      faculty: a.faculty,
      section: a.section,
      attachmentUrl: a.attachmentUrl,
      attachmentName: a.attachmentName,
      createdAt: a.createdAt,
      createdBy: a.createdBy,
      submission: a.submissions[0] || null,
    }));

    return res.json({ ok: true, assignments: payload });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Failed to load assignments" });
  }
});

router.post("/api/assignments/:id/submission", requireAuth(Role.STUDENT), upload.single("attachment"), async (req, res) => {
  const assignmentId = Number(req.params.id);
  if (!Number.isInteger(assignmentId)) {
    return res.status(400).json({ ok: false, error: "Invalid assignment id" });
  }

  try {
    const student = await prisma.student.findFirst({ where: { userId: req.user.userId } });
    if (!student) {
      return res.status(404).json({ ok: false, error: "Student profile not found" });
    }

    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) {
      return res.status(404).json({ ok: false, error: "Assignment not found" });
    }

    if (
      assignment.batch !== student.batch ||
      assignment.faculty !== student.faculty ||
      assignment.section !== student.section
    ) {
      return res.status(403).json({ ok: false, error: "Assignment is not for your class" });
    }

    const submission = await prisma.assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId: student.id,
        },
      },
      create: {
        assignmentId,
        studentId: student.id,
        note: req.body?.note || null,
        attachmentUrl: req.file ? `/uploads/${req.file.filename}` : null,
        attachmentName: req.file ? req.file.originalname : null,
      },
      update: {
        note: req.body?.note || null,
        attachmentUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
        attachmentName: req.file ? req.file.originalname : undefined,
      },
    });

    return res.status(201).json({ ok: true, submission });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Failed to submit assignment" });
  }
});

router.get("/api/assignments/:id/submissions", requireAuth(), async (req, res) => {
  const assignmentId = Number(req.params.id);
  if (!Number.isInteger(assignmentId)) {
    return res.status(400).json({ ok: false, error: "Invalid assignment id" });
  }

  try {
    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) {
      return res.status(404).json({ ok: false, error: "Assignment not found" });
    }

    if (req.user.role === Role.TEACHER && assignment.createdById !== req.user.userId) {
      return res.status(403).json({ ok: false, error: "Not allowed to view submissions for this assignment" });
    }

    if (req.user.role !== Role.TEACHER && req.user.role !== Role.ADMIN) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    const submissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId },
      orderBy: [{ submittedAt: "desc" }],
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
          },
        },
      },
    });

    return res.json({ ok: true, submissions });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Failed to load submissions" });
  }
});

module.exports = router;
