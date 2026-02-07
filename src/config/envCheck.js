function checkEnv() {
  const required = [
    "NODE_ENV",
    "DB_HOST",
    "DB_PORT",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
    "JWT_SECRET",
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ Missing environment variables:");
    missing.forEach(k => console.error("   -", k));
    process.exit(1); // stop server
  }

  console.log("🌍 Environment:", process.env.NODE_ENV);
}

module.exports = checkEnv;
