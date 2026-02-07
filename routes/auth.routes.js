const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const pool = require("../src/config/db");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "axo-secret";

/* ======================================================
   LOGIN (SINGLE, DB-DRIVEN, STABLE)
====================================================== */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required",
      });
    }

    // 🔹 Fetch user (admin included)
    const result = await pool.query(
      `SELECT id, email, password_hash, role, status
       FROM users
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (!result.rows.length) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const user = result.rows[0];

    if (user.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "Account not active",
      });
    }

    if (!user.password_hash) {
      console.error("❌ password_hash missing for", email);
      return res.status(500).json({
        success: false,
        message: "Server configuration error",
      });
    }

    // 🔹 Password check
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // 🔹 Token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });

  } catch (err) {
    console.error("❌ LOGIN ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;

