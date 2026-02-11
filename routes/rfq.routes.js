const express = require("express");
const router = express.Router();

const rfqController = require("../src/controllers/rfq.controller");
const {
  authenticate,
  authorizeBuyer,
  authorizeSupplier
} = require("../middleware/auth.middleware");

/* ======================================================
   BUYER ROUTES
====================================================== */

/**
 * Create RFQ (Buyer only)
 * POST /api/rfqs
 */
router.post(
  "/",
  authenticate,
  authorizeBuyer,
  rfqController.createRFQ
);

/**
 * Get RFQs for Logged-in Buyer
 * GET /api/rfqs
 */
router.get(
  "/",
  authenticate,
  authorizeBuyer,
  (req, res, next) => {
    // Force buyer_id from JWT only (security)
    req.query.buyer_id = req.user.id;
    next();
  },
  rfqController.getRFQsByBuyer
);

/* ======================================================
   SUPPLIER ROUTES
====================================================== */

/**
 * Get RFQs for Supplier Dashboard
 * GET /api/rfqs/supplier
 */
router.get(
  "/supplier",
  authenticate,
  authorizeSupplier,
  rfqController.getRFQsForSupplier
);

/* ======================================================
   SHARED ROUTES
====================================================== */

/**
 * Get RFQ by ID
 * GET /api/rfqs/:id
 */
router.get(
  "/:id",
  authenticate,
  rfqController.getRFQById
);

module.exports = router;
