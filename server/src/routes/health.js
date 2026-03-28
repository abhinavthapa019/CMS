const { Router } = require("express");

const router = Router();

router.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "CMS server is running" });
});

module.exports = router;
