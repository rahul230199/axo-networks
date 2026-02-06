const rfqModel = require("../../models/rfq.model");


/**
 * Create RFQ (Draft)
 * POST /rfqs
 */
const createRFQ = async (req, res) => {
  try {
    // TEMP fallback (won’t fix FK, just ensures field exists)
    req.body.buyer_id = req.body.buyer_id || 1;

    const rfq = await rfqModel.createRFQ(req.body);

    return res.status(201).json({
      success: true,
      message: "RFQ created successfully",
      data: rfq,
    });
  } catch (error) {
    console.error("Create RFQ error:", error);

    return res.status(500).json({
      success: false,
      message: error.message, // ✅ THIS LINE IS THE KEY
    });
  }
};

/**
 * Get RFQs by Buyer
 * GET /rfqs?buyer_id=1
 */
const getRFQsByBuyer = async (req, res) => {
  try {
    const { buyer_id } = req.query;

    if (!buyer_id) {
      return res.status(400).json({
        success: false,
        message: "buyer_id is required",
      });
    }

    const rfqs = await rfqModel.getRFQsByBuyer(buyer_id);

    return res.status(200).json({
      success: true,
      data: rfqs,
    });
  } catch (error) {
    console.error("Get RFQs error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch RFQs",
    });
  }
};

/**
 * Get RFQ Details
 * GET /rfqs/:id
 */
const getRFQById = async (req, res) => {
  try {
    const { id } = req.params;

    const rfq = await rfqModel.getRFQById(id);

    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: "RFQ not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: rfq,
    });
  } catch (error) {
    console.error("Get RFQ error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createRFQ,
  getRFQsByBuyer,
  getRFQById,
};
