const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");

function issueToken(user) {
  return jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

function requireAuth(role) {
  return (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
      return res.status(401).json({ ok: false, error: "Missing token" });
    }
    try {
      const token = auth.split(" ")[1];
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
      if (role && payload.role !== role) {
        return res.status(403).json({ ok: false, error: "Forbidden" });
      }
      return next();
    } catch (err) {
      return res.status(401).json({ ok: false, error: "Invalid token" });
    }
  };
}

module.exports = { issueToken, requireAuth };
