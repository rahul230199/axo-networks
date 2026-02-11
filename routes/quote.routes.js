const express = require("express");
const router = express.Router();

const quoteController = require("../src/controllers/quote.controller");
const {
  authenticate,
  authorizeBuyer,
  authorizeSupplier
} = require("../middleware/auth.middleware");

/* ======================================================
   SUPPLIER ROUTES
====================================================== */

/**
 * Submit Quote (Supplier only)
 * POST /api/quotes
 */
router.post(
  "/",
  authenticate,
  authorizeSupplier,
  quoteController.submitQuote
);

/* ======================================================
   BUYER ROUTES
====================================================== */

/**
 * Buyer views quotes for their RFQ
 * GET /api/quotes/rfq/:rfq_id
 */
router.get(
  "/rfq/:rfq_id",
  authenticate,
  authorizeBuyer,
  quoteController.getQuotesByRFQ
);

/* ======================================================
   SHARED ROUTES
====================================================== */

/**
 * Get single quote
 * GET /api/quotes/:id
 */
router.get(
  "/:id",
  authenticate,
  quoteController.getQuoteById
);

module.exports = router;
