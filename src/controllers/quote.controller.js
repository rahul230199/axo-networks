const quoteModel = require("../../models/quote.model");
const pool = require("../config/db");

/**
 * Supplier submits a quote
 * POST /quotes
 */
const submitQuote = async (req, res) => {
  try {
    const supplierId = req.user.id;

    const payload = {
      ...req.body,
      supplier_id: supplierId
    };

    // Optional: prevent quoting own RFQ
    const rfqCheck = await pool.query(
      "SELECT buyer_id, status FROM rfqs WHERE id = $1",
      [payload.rfq_id]
    );

    if (!rfqCheck.rows.length) {
      return res.status(404).json({
        success: false,
        message: "RFQ not found"
      });
    }

    const rfq = rfqCheck.rows[0];

    if (rfq.buyer_id === supplierId) {
      return res.status(403).json({
        success: false,
        message: "You cannot quote your own RFQ"
      });
    }

    if (rfq.status === "draft") {
      return res.status(400).json({
        success: false,
        message: "Cannot quote draft RFQ"
      });
    }

    const quote = await quoteModel.createQuote(payload);

    return res.status(201).json({
      success: true,
      message: "Quote submitted successfully",
      data: quote,
    });

  } catch (error) {
    console.error("Submit quote error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit quote",
    });
  }
};

/**
 * Buyer views quotes for RFQ
 * GET /quotes/rfq/:rfq_id
 */
const getQuotesByRFQ = async (req, res) => {
  try {
    const rfqId = parseInt(req.params.rfq_id);
    const buyerId = req.user.id;

    if (isNaN(rfqId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid RFQ ID"
      });
    }

    // Verify ownership
    const rfqCheck = await pool.query(
      "SELECT buyer_id FROM rfqs WHERE id = $1",
      [rfqId]
    );

    if (!rfqCheck.rows.length) {
      return res.status(404).json({
        success: false,
        message: "RFQ not found"
      });
    }

    if (rfqCheck.rows[0].buyer_id !== buyerId) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const quotes = await quoteModel.getQuotesByRFQ(rfqId);

    return res.status(200).json({
      success: true,
      data: quotes,
    });

  } catch (error) {
    console.error("Get quotes error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch quotes",
    });
  }
};

/**
 * Get single quote
 * GET /quotes/:id
 */
const getQuoteById = async (req, res) => {
  try {
    const quoteId = parseInt(req.params.id);

    if (isNaN(quoteId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Quote ID"
      });
    }

    const quote = await quoteModel.getQuoteById(quoteId);

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: "Quote not found",
      });
    }

    const userId = req.user.id;
    const role = req.user.role;

    // Admin can see all
    if (role === "admin") {
      return res.status(200).json({
        success: true,
        data: quote,
      });
    }

    // Supplier can see own quote
    if (role === "supplier" || role === "both") {
      if (quote.supplier_id !== userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    // Buyer can see if RFQ belongs to them
    if (role === "buyer") {
      const rfqCheck = await pool.query(
        "SELECT buyer_id FROM rfqs WHERE id = $1",
        [quote.rfq_id]
      );

      if (
        !rfqCheck.rows.length ||
        rfqCheck.rows[0].buyer_id !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: quote,
    });

  } catch (error) {
    console.error("Get quote error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch quote",
    });
  }
};

module.exports = {
  submitQuote,
  getQuotesByRFQ,
  getQuoteById,
};
