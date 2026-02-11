const pool = require("../src/config/db");

/**
 * Create Purchase Order
 */
const createPurchaseOrder = async (data) => {
  const {
    rfq_id,
    quote_id,
    buyer_id,
    supplier_id,
    quantity,
    price,
  } = data;

  try {
    const query = `
      INSERT INTO purchase_orders (
        rfq_id,
        quote_id,
        buyer_id,
        supplier_id,
        quantity,
        price,
        status
      )
      VALUES ($1,$2,$3,$4,$5,$6,'issued')
      RETURNING *;
    `;

    const values = [
      rfq_id,
      quote_id,
      buyer_id,
      supplier_id,
      quantity,
      price,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];

  } catch (error) {
    if (error.code === "23505") {
      throw new Error("Purchase order already exists for this quote");
    }
    throw error;
  }
};

/**
 * Get POs by Buyer (Dashboard Ready)
 */
const getPOsByBuyer = async (buyer_id) => {
  const query = `
    SELECT 
      po.*,
      r.part_name,
      r.total_quantity,
      q.price AS quoted_price,
      u.username AS supplier_name,
      u.email AS supplier_email

    FROM purchase_orders po

    JOIN rfqs r
      ON r.id = po.rfq_id

    JOIN quotes q
      ON q.id = po.quote_id

    JOIN users u
      ON u.id = po.supplier_id

    WHERE po.buyer_id = $1

    ORDER BY po.created_at DESC;
  `;

  const result = await pool.query(query, [buyer_id]);
  return result.rows;
};

/**
 * Get POs by Supplier (Dashboard Ready)
 */
const getPOsBySupplier = async (supplier_id) => {
  const query = `
    SELECT 
      po.*,
      r.part_name,
      r.total_quantity,
      q.price AS quoted_price,
      u.username AS buyer_name,
      u.email AS buyer_email

    FROM purchase_orders po

    JOIN rfqs r
      ON r.id = po.rfq_id

    JOIN quotes q
      ON q.id = po.quote_id

    JOIN users u
      ON u.id = po.buyer_id

    WHERE po.supplier_id = $1

    ORDER BY po.created_at DESC;
  `;

  const result = await pool.query(query, [supplier_id]);
  return result.rows;
};

/**
 * Get PO by ID (Detailed)
 */
const getPOById = async (po_id) => {
  const query = `
    SELECT 
      po.*,
      r.part_name,
      r.total_quantity,
      r.delivery_timeline,
      r.material_specification,
      q.price AS quoted_price,
      buyer.username AS buyer_name,
      buyer.email AS buyer_email,
      supplier.username AS supplier_name,
      supplier.email AS supplier_email

    FROM purchase_orders po

    JOIN rfqs r
      ON r.id = po.rfq_id

    JOIN quotes q
      ON q.id = po.quote_id

    JOIN users buyer
      ON buyer.id = po.buyer_id

    JOIN users supplier
      ON supplier.id = po.supplier_id

    WHERE po.id = $1;
  `;

  const result = await pool.query(query, [po_id]);
  return result.rows[0];
};

module.exports = {
  createPurchaseOrder,
  getPOsByBuyer,
  getPOsBySupplier,
  getPOById,
};
