require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret",
  ML_SERVICE_URL: process.env.ML_SERVICE_URL || "",
};
