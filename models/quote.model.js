const pool = require("../src/config/db");

/**
 * Submit Supplier Quote
 */
const createQuote = async (data) => {
  const {
    rfq_id,
    supplier_id,
    price,
    batch_quantity,
    delivery_timeline,
    material_specification,
    certifications,
  } = data;

  try {
    const query = `
      INSERT INTO quotes (
        rfq_id,
        supplier_id,
        price,
        batch_quantity,
        delivery_timeline,
        material_specification,
        certifications,
        status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,'submitted')
      RETURNING *;
    `;

    const values = [
      rfq_id,
      supplier_id,
      price,
      batch_quantity,
      delivery_timeline,
      material_specification,
      certifications,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];

  } catch (error) {
    // Handle duplicate quote
    if (error.code === "23505") {
      throw new Error("You have already submitted a quote for this RFQ");
    }
    throw error;
  }
};

/**
 * Get Quotes for RFQ (Buyer View)
 */
const getQuotesByRFQ = async (rfq_id) => {
  const query = `
    SELECT 
      q.*,
      u.email AS supplier_email,
      u.username AS supplier_name,
      po.id AS purchase_order_id

    FROM quotes q
    JOIN users u
      ON u.id = q.supplier_id

    LEFT JOIN purchase_orders po
      ON po.quote_id = q.id

    WHERE q.rfq_id = $1

    ORDER BY q.created_at DESC;
  `;

  const result = await pool.query(query, [rfq_id]);
  return result.rows;
};

/**
 * Get Quote by ID (Detailed)
 */
const getQuoteById = async (quote_id) => {
  const query = `
    SELECT 
      q.*,
      r.part_name,
      r.total_quantity,
      r.status AS rfq_status,
      u.email AS supplier_email,
      u.username AS supplier_name,
      po.id AS purchase_order_id,
      po.status AS po_status

    FROM quotes q

    JOIN rfqs r
      ON r.id = q.rfq_id

    JOIN users u
      ON u.id = q.supplier_id

    LEFT JOIN purchase_orders po
      ON po.quote_id = q.id

    WHERE q.id = $1;
  `;

  const result = await pool.query(query, [quote_id]);
  return result.rows[0];
};

module.exports = {
  createQuote,
  getQuotesByRFQ,
  getQuoteById,
};
