require("dotenv").config();

const checkEnv = require("./src/config/envCheck");
checkEnv();

const express = require("express");
const path = require("path");

// ✅ SHARED DB POOL
const pool = require("./src/config/db");

// Swagger
const swaggerSetup = require("./src/docs/swagger");

// Local seed users
const { createLocalUsers } = require("./src/seed/localUsers.seed");

// Routes
const rfqRoutes = require("./routes/rfq.routes");
const rfqFiles = require("./routes/rfqFiles.routes");
const quoteRoutes = require("./routes/quote.routes");
const rfqMessagesRoutes = require("./routes/rfqMessage.routes");
const purchaseOrderRoutes = require("./routes/purchaseOrder.routes");
const quoteAcceptanceRoutes = require("./routes/quoteAcceptance.routes");
const authRoutes = require("./routes/auth.routes");

// Middleware
const errorHandler = require("./middleware/errorHandler.middleware");

// Services
const { createUsersFromRequest } = require("./services/userProvisioningService");

const app = express();
const PORT = process.env.PORT || 3000;

/* ===================== SWAGGER ===================== */
swaggerSetup(app);

/* ===================== MIDDLEWARE ===================== */
app.use(express.json());

/* ---------- SAFE CORS (LOCAL + PROD) ---------- */
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://www.axonetworks.com"
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

/* ===================== FRONTEND ===================== */
// ✅ Serve frontend FIRST
app.use(express.static(path.join(__dirname, "frontend")));

app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "frontend", "login.html"));
});

app.get("/login", (_, res) => {
  res.sendFile(path.join(__dirname, "frontend", "login.html"));
});

app.get("/buyer-dashboard", (_, res) => {
  res.sendFile(path.join(__dirname, "frontend", "buyer-dashboard.html"));
});


app.get("/admin-dashboard", (_, res) => {
  res.sendFile(path.join(__dirname, "frontend", "admin-dashboard.html"));
});

/* ===================== API ROUTES ===================== */
app.use("/api/auth", authRoutes);
app.use("/api/rfqs", rfqRoutes);
app.use("/api/rfq-files", rfqFiles);
app.use("/api/quotes", quoteRoutes);
app.use("/api/quotes", quoteAcceptanceRoutes);
app.use("/api/rfq-messages", rfqMessagesRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);

/* ===================== HEALTH CHECK ===================== */
app.get("/api/_health", async (_, res) => {
  let dbStatus = "up";
  let dbTime = null;

  try {
    const r = await pool.query("SELECT NOW()");
    dbTime = r.rows[0].now;
  } catch (err) {
    console.error("❌ DB not reachable:", err.message);
    dbStatus = "down";
  }

  res.json({
    status: "up",
    dbStatus,
    dbTime
  });
});

/* ===================== NETWORK ACCESS ===================== */
app.get("/api/network-request", async (_, res, next) => {
  try {
    const r = await pool.query(
      `SELECT * FROM network_access_requests 
       ORDER BY submission_timestamp DESC`
    );
    res.json({ success: true, data: r.rows });
  } catch (err) {
    next(err);
  }
});

app.post("/api/network-request", async (req, res, next) => {
  try {
    const {
      companyName, website, registeredAddress, cityState,
      contactName, role, email, phone, whatYouDo,
      primaryProduct, keyComponents, manufacturingLocations,
      monthlyCapacity, certifications, roleInEV, whyJoinAXO
    } = req.body;

    const r = await pool.query(
      `INSERT INTO network_access_requests (
        company_name, website, registered_address, city_state,
        contact_name, role, email, phone, what_you_do,
        primary_product, key_components, manufacturing_locations,
        monthly_capacity, certifications, role_in_ev, why_join_axo
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,
        $10,$11,$12,$13,$14,$15,$16
      ) RETURNING id`,
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

    res.json({ success: true, id: r.rows[0].id });
  } catch (err) {
    next(err);
  }
});

/* ===================== APPROVE / REJECT ===================== */
app.put("/api/network-request/:id/status", async (req, res, next) => {
  try {
    const { status, verificationNotes } = req.body;

    const r = await pool.query(
      `UPDATE network_access_requests
       SET status=$1, verification_notes=$2
       WHERE id=$3
       RETURNING *`,
      [status, verificationNotes || null, req.params.id]
    );

    if (!r.rows.length) {
      return res.status(404).json({ success: false });
    }

    // ✅ Create user ONLY on verification
    if (status === "verified") {
      await createUsersFromRequest(pool, r.rows[0]);
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/* ===================== ERROR HANDLER (LAST) ===================== */
app.use(errorHandler);

/* ===================== LOCAL SEED USERS ===================== */
if (process.env.NODE_ENV === "development") {
  createLocalUsers(pool).catch(err => {
    console.error("❌ Failed to create local users:", err.message);
  });
}

/* ===================== START SERVER ===================== */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
