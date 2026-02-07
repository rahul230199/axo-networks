const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const pool = require("../src/config/db");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

/* ======================================================
   TOKEN HELPERS (ADDITIVE, SAFE)
====================================================== */
function generateAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "8h", // SAME as before
  });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: "14d", // NEW (non-breaking)
  });
}

/* ======================================================
   LOGIN (NO FUNCTIONALITY BROKEN)
====================================================== */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    /* =========================
       ADMIN LOGIN (UNCHANGED)
    ========================== */
    if (email && email.toLowerCase() === "admin@axonetworks.com") {
      if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      const accessToken = generateAccessToken({
        userId: "admin",
        role: "ADMIN",
      });

      const refreshToken = generateRefreshToken({
        userId: "admin",
        role: "ADMIN",
      });

      return res.json({
        success: true,
        token: accessToken,      // SAME key
        refreshToken,            // NEW (optional)
        user: {
          email,
          role: "ADMIN",
        },
      });
    }

    /* =========================
       USER LOGIN (UNCHANGED)
    ========================== */
    const result = await pool.query(
      `SELECT id, email, password_hash, role, status
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (!result.rows.length || result.rows[0].status !== "active") {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      role: user.role,
    });

    res.json({
      success: true,
      token: accessToken,        // SAME key
      refreshToken,              // NEW (optional)
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ LOGIN ERROR:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* ======================================================
   REFRESH TOKEN (NEW, SAFE, ADDITIVE)
====================================================== */
router.post("/refresh-token", (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: "Refresh token required",
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    const newAccessToken = generateAccessToken({
      userId: decoded.userId,
      role: decoded.role,
    });

    res.json({
      success: true,
      token: newAccessToken, // SAME key as login
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
});

module.exports = router;
