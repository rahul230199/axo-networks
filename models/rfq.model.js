const pool = require("../src/config/db");


/**
 * Create RFQ (Draft)
 */
const createRFQ = async (data) => {
  const {
    buyer_id,
    part_name,
    part_id,
    total_quantity,
    batch_quantity,
    target_price,
    delivery_timeline,
    material_specification,
    ppap_level,
    status,
  } = data;

  const query = `
    INSERT INTO rfqs (
      buyer_id,
      part_name,
      part_id,
      total_quantity,
      batch_quantity,
      target_price,
      delivery_timeline,
      material_specification,
      ppap_level,
      status
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *;
  `;

  const values = [
    buyer_id,
    part_name,
    part_id,
    total_quantity,
    batch_quantity,
    target_price,
    delivery_timeline,
    material_specification,
    ppap_level,
    status || "draft",
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Get RFQs by Buyer
 */
const getRFQsByBuyer = async (buyer_id) => {
  const query = `
    SELECT *
    FROM rfqs
    WHERE buyer_id = $1
    ORDER BY created_at DESC;
  `;

  const result = await pool.query(query, [buyer_id]);
  return result.rows;
};

/**
 * Get RFQ by ID
 */
const getRFQById = async (rfq_id) => {
  const query = `
    SELECT *
    FROM rfqs
    WHERE id = $1;
  `;

  const result = await pool.query(query, [rfq_id]);
  return result.rows[0];
};

module.exports = {
  createRFQ,
  getRFQsByBuyer,
  getRFQById,
};
