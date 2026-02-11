const jwt = require("jsonwebtoken");
const pool = require("../src/config/db");

/* ===================== AUTH ===================== */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload"
      });
    }

    // Fetch user from DB
    const result = await pool.query(
      `SELECT id, email, role, status
       FROM users
       WHERE id = $1`,
      [decoded.userId]
    );

    if (!result.rows.length) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    const user = result.rows[0];

    if (user.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "User inactive"
      });
    }

    // Normalize role (important)
    user.role = user.role.toLowerCase();

    req.user = user;

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};

/* ===================== ROLE GUARDS ===================== */

const authorizeAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access only"
    });
  }
  next();
};

const authorizeBuyer = (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized"
    });
  }

  // buyer OR both
  if (req.user.role !== "buyer" && req.user.role !== "both") {
    return res.status(403).json({
      success: false,
      message: "Buyer access only"
    });
  }

  next();
};

const authorizeSupplier = (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized"
    });
  }

  // supplier OR both
  if (req.user.role !== "supplier" && req.user.role !== "both") {
    return res.status(403).json({
      success: false,
      message: "Supplier access only"
    });
  }

  next();
};

module.exports = {
  authenticate,
  authorizeAdmin,
  authorizeBuyer,
  authorizeSupplier
};
