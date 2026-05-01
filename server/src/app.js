const express = require("express");
const cors = require("cors");
const path = require("path");

const healthRoutes = require("./routes/health");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const studentRoutes = require("./routes/students");
const predictionRoutes = require("./routes/prediction");
const academicRoutes = require("./routes/academics");
const analyticsRoutes = require("./routes/analytics");
const classTeacherRoutes = require("./routes/classTeachers");
const noticeRoutes = require("./routes/notices");
const assignmentRoutes = require("./routes/assignments");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use(healthRoutes);
app.use(authRoutes);
app.use(userRoutes);
app.use(studentRoutes);
app.use(predictionRoutes);
app.use(academicRoutes);
app.use(analyticsRoutes);
app.use(classTeacherRoutes);
app.use(noticeRoutes);
app.use(assignmentRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ ok: false, error: "Unexpected server error" });
});

module.exports = app;
