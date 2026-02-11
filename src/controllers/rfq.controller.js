const rfqModel = require("../../models/rfq.model");

/**
 * Create RFQ (Buyer)
 * POST /rfqs
 */
const createRFQ = async (req, res) => {
  try {
    // 🔒 Force buyer_id from authenticated user only
    const payload = {
      ...req.body,
      buyer_id: req.user.id
    };

    const rfq = await rfqModel.createRFQ(payload);

    return res.status(201).json({
      success: true,
      message: "RFQ created successfully",
      data: rfq
    });

  } catch (error) {
    console.error("Create RFQ error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create RFQ"
    });
  }
};

/**
 * Get RFQs by Buyer
 * GET /rfqs
 */
const getRFQsByBuyer = async (req, res) => {
  try {
    const buyerId = req.user.id;

    const rfqs = await rfqModel.getRFQsByBuyer(buyerId);

    return res.status(200).json({
      success: true,
      data: rfqs
    });

  } catch (error) {
    console.error("Get RFQs error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch RFQs"
    });
  }
};

/**
 * Get RFQs for Supplier Dashboard
 * GET /rfqs/supplier
 */
const getRFQsForSupplier = async (req, res) => {
  try {
    const supplierId = req.user.id;

    const rfqs = await rfqModel.getRFQsForSupplier(supplierId);

    return res.status(200).json({
      success: true,
      data: rfqs
    });

  } catch (error) {
    console.error("Get Supplier RFQs error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch supplier RFQs"
    });
  }
};

/**
 * Get RFQ Details
 * GET /rfqs/:id
 */
const getRFQById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid RFQ ID"
      });
    }

    const rfq = await rfqModel.getRFQById(id);

    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: "RFQ not found"
      });
    }

    // 🔒 Access Control Check
    const userRole = req.user.role;
    const userId = req.user.id;

    if (
      userRole === "buyer" &&
      rfq.buyer_id !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    // Suppliers allowed to view open RFQs
    // OR if they have already quoted (depends on model logic)

    return res.status(200).json({
      success: true,
      data: rfq
    });

  } catch (error) {
    console.error("Get RFQ error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch RFQ"
    });
  }
};

module.exports = {
  createRFQ,
  getRFQsByBuyer,
  getRFQsForSupplier,
  getRFQById
};
