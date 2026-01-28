require("dotenv").config();
const express = require("express");
const authRoutes = require("./routes/auth.routes");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

/* ======================================================
   POSTGRES CONNECTION
====================================================== */
const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  database: process.env.PGDATABASE || "axo_networks",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "",
  port: process.env.PGPORT || 5432,
});

/* ======================================================
   MIDDLEWARE
====================================================== */
app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

/* ======================================================
   ROUTES
====================================================== */
app.use("/api/auth", authRoutes);


/* ======================================================
   DB INIT
====================================================== */
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS network_access_requests (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        website VARCHAR(255),
        registered_address TEXT,
        city_state VARCHAR(255) NOT NULL,
        contact_name VARCHAR(255) NOT NULL,
        role VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        what_you_do JSONB NOT NULL,
        primary_product TEXT NOT NULL,
        key_components TEXT NOT NULL,
        manufacturing_locations TEXT NOT NULL,
        monthly_capacity VARCHAR(100) NOT NULL,
        certifications TEXT,
        role_in_ev VARCHAR(50) NOT NULL,
        why_join_axo TEXT NOT NULL,
        submission_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'pending',
        verification_notes TEXT
      );
    `);

    console.log("✅ Database ready");
  } catch (err) {
    console.error("❌ DB init error:", err.message);
  }
})();

/* ======================================================
   HEALTH CHECK
====================================================== */
app.get("/api/_health", async (req, res) => {
  try {
    const r = await pool.query("SELECT NOW()");
    res.json({ status: "up", dbTime: r.rows[0].now });
  } catch (e) {
    res.status(500).json({ status: "down", error: e.message });
  }
});

/* ======================================================
   GET ALL REQUESTS (ADMIN DASHBOARD)
====================================================== */
app.get("/api/network-request", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *,
      EXTRACT(EPOCH FROM submission_timestamp) * 1000 AS submitted_at_ms
      FROM network_access_requests
      ORDER BY submission_timestamp DESC
    `);

    res.json({
      success: true,
      data: result.rows.map(r => ({
        ...r,
        submittedAt: new Date(Number(r.submitted_at_ms)).toISOString()
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ======================================================
   GET SINGLE REQUEST (VIEW MODAL)
====================================================== */
app.get("/api/network-request/:id", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT * FROM network_access_requests WHERE id=$1",
      [req.params.id]
    );
    if (!r.rows.length) {
      return res.status(404).json({ success: false });
    }
    res.json({ success: true, data: r.rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/* ======================================================
   POST NETWORK REQUEST (FORM SUBMIT)
====================================================== */
app.post("/api/network-request", async (req, res) => {
  try {
    console.log("📥 POST /api/network-request");

    const {
      companyName, website, registeredAddress, cityState,
      contactName, role, email, phone, whatYouDo,
      primaryProduct, keyComponents, manufacturingLocations,
      monthlyCapacity, certifications, roleInEV, whyJoinAXO
    } = req.body;

    if (
      !companyName || !cityState || !contactName || !role ||
      !email || !phone || !whatYouDo || !primaryProduct ||
      !keyComponents || !manufacturingLocations ||
      !monthlyCapacity || !roleInEV || !whyJoinAXO
    ) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields"
      });
    }

    const result = await pool.query(
      `INSERT INTO network_access_requests (
        company_name, website, registered_address, city_state,
        contact_name, role, email, phone, what_you_do,
        primary_product, key_components, manufacturing_locations,
        monthly_capacity, certifications, role_in_ev, why_join_axo
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,
        $10,$11,$12,$13,$14,$15,$16
      )
      RETURNING id`,
      [
        companyName,
        website || null,
        registeredAddress || null,
        cityState,
        contactName,
        role,
        email,
        phone,
        JSON.stringify(whatYouDo),
        primaryProduct,
        keyComponents,
        manufacturingLocations,
        monthlyCapacity,
        certifications || null,
        roleInEV,
        whyJoinAXO
      ]
    );

    res.status(201).json({
      success: true,
      id: result.rows[0].id
    });

  } catch (err) {
    console.error("❌ POST error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ======================================================
   UPDATE STATUS (APPROVE / REJECT)
====================================================== */
app.put("/api/network-request/:id/status", async (req, res) => {
  try {
    const { status, verificationNotes } = req.body;

    const r = await pool.query(
      `UPDATE network_access_requests
       SET status=$1, verification_notes=$2
       WHERE id=$3
       RETURNING id,status`,
      [status, verificationNotes || null, req.params.id]
    );

    if (!r.rows.length) {
      return res.status(404).json({ success: false });
    }

    res.json({ success: true, data: r.rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/* ======================================================
   START SERVER
====================================================== */
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

