const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const AuthService = require("../services/AuthService");
const PasswordResetService = require("../services/PasswordResetService");

// Login endpoint
router.post("/login", async (req, res) => {
  try {
    const { email, password, newPassword } = req.body;

    console.log("🔐 LOGIN ATTEMPT:", { email, hasNewPassword: !!newPassword });

    // Try admin login first
    const adminResult = await AuthService.adminLogin(email, password);
    if (adminResult) {
      return res.json(adminResult);
    }

    // User login
    const userResult = await AuthService.userLogin(email, password, newPassword);

    if (userResult.success) {
      res.json(userResult);
    } else {
      res.status(401).json(userResult);
    }

  } catch (error) {
    console.error("🔥 Login endpoint error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Force password reset (for first-time users)
router.post("/force-reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const result = await PasswordResetService.forceResetPassword(email, newPassword);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("❌ Force password reset endpoint error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Auth status
router.get("/status", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.json({
        authenticated: false,
        message: "No token provided"
      });
    }

    const result = await AuthService.verifyToken(token);
    res.json(result);
  } catch (error) {
    console.error("Auth status error:", error);
    res.json({
      authenticated: false,
      message: "Server error"
    });
  }
});

// Get user profile
router.get("/profile", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    const result = await AuthService.getProfile(decoded.userId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
