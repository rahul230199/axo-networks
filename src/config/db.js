console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_SSL:", process.env.DB_SSL);

const { Pool } = require("pg");

const isSSL = process.env.DB_SSL === "true";

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // ✅ Correct SSL handling (AWS RDS compatible)
  ssl: isSSL
    ? {
        rejectUnauthorized: false, // required for RDS unless CA is provided
      }
    : false,

  // ✅ Stability / safety
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

/* ===================== CONNECTION TEST ===================== */
(async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("✅ PostgreSQL connected at:", res.rows[0].now);
  } catch (err) {
    console.error("❌ PostgreSQL connection FAILED:", err.message);
    process.exit(1);
  }
})();

/* ===================== POOL EVENTS ===================== */
pool.on("connect", () => {
  console.log("🔌 New PostgreSQL client connected");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL pool error:", err.message);
  process.exit(1);
});

module.exports = pool;
