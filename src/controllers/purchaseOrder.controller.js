const purchaseOrderModel = require("../../models/purchaseOrder.model");
const pool = require("../config/db");

/**
 * Buyer accepts quote → Create Purchase Order
 */
const createPurchaseOrder = async (req, res) => {
  try {
    const buyerId = req.user.id;

    const {
      rfq_id,
      quote_id,
      quantity,
      price,
    } = req.body;

    if (!rfq_id || !quote_id || !quantity || !price) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // 🔒 Verify RFQ belongs to buyer
    const rfqCheck = await pool.query(
      "SELECT buyer_id FROM rfqs WHERE id = $1",
      [rfq_id]
    );

    if (!rfqCheck.rows.length) {
      return res.status(404).json({
        success: false,
        message: "RFQ not found",
      });
    }

    if (rfqCheck.rows[0].buyer_id !== buyerId) {
      return res.status(403).json({
        success: false,
        message: "You do not own this RFQ",
      });
    }

    // 🔒 Verify Quote exists and matches RFQ
    const quoteCheck = await pool.query(
      "SELECT supplier_id FROM quotes WHERE id = $1 AND rfq_id = $2",
      [quote_id, rfq_id]
    );

    if (!quoteCheck.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Quote not found for this RFQ",
      });
    }

    const supplierId = quoteCheck.rows[0].supplier_id;

    // 🔒 Prevent duplicate PO for same quote
    const existingPO = await pool.query(
      "SELECT id FROM purchase_orders WHERE quote_id = $1",
      [quote_id]
    );

    if (existingPO.rows.length) {
      return res.status(400).json({
        success: false,
        message: "Purchase Order already exists for this quote",
      });
    }

    const po = await purchaseOrderModel.createPurchaseOrder({
      rfq_id,
      quote_id,
      buyer_id: buyerId,
      supplier_id: supplierId,
      quantity,
      price,
    });

    return res.status(201).json({
      success: true,
      message: "Purchase Order issued",
      data: po,
    });

  } catch (error) {
    console.error("Create PO error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create purchase order",
    });
  }
};

/**
 * Buyer PO list
 */
const getPOsByBuyer = async (req, res) => {
  try {
    const buyerId = req.user.id;

    const pos = await purchaseOrderModel.getPOsByBuyer(buyerId);

    return res.status(200).json({
      success: true,
      data: pos,
    });

  } catch (error) {
    console.error("Get buyer POs error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch POs",
    });
  }
};

/**
 * Supplier PO list
 */
const getPOsBySupplier = async (req, res) => {
  try {
    const supplierId = req.user.id;

    const pos = await purchaseOrderModel.getPOsBySupplier(supplierId);

    return res.status(200).json({
      success: true,
      data: pos,
    });

  } catch (error) {
    console.error("Get supplier POs error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch POs",
    });
  }
};

/**
 * Get PO details
 */
const getPOById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid PO ID",
      });
    }

    const po = await purchaseOrderModel.getPOById(id);

    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    const userId = req.user.id;
    const role = req.user.role;

    // Admin can view all
    if (role === "admin") {
      return res.status(200).json({
        success: true,
        data: po,
      });
    }

    // Buyer can view own PO
    if (role === "buyer" || role === "both") {
      if (po.buyer_id !== userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    // Supplier can view own PO
    if (role === "supplier" || role === "both") {
      if (po.supplier_id !== userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: po,
    });

  } catch (error) {
    console.error("Get PO error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch purchase order",
    });
  }
};

module.exports = {
  createPurchaseOrder,
  getPOsByBuyer,
  getPOsBySupplier,
  getPOById,
};
