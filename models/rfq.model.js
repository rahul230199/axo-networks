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
    status
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
    status || "draft"
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
 * Get RFQs for Supplier Dashboard
 */
const getRFQsForSupplier = async (supplier_id) => {
  const query = `
    SELECT
      r.id,
      r.part_name,
      r.part_id,
      r.total_quantity,
      r.batch_quantity,
      r.target_price,
      r.delivery_timeline,
      r.material_specification,
      r.ppap_level,
      r.status AS rfq_status,
      r.created_at,

      q.id AS quote_id,
      q.status AS quote_status,
      q.price,
      q.created_at AS quoted_at,

      CASE
        WHEN po.id IS NOT NULL THEN true
        ELSE false
      END AS has_po

    FROM rfqs r

    LEFT JOIN quotes q
      ON q.rfq_id = r.id
     AND q.supplier_id = $1

    LEFT JOIN purchase_orders po
      ON po.quote_id = q.id

    WHERE
      r.status != 'draft'

    ORDER BY r.created_at DESC;
  `;

  const result = await pool.query(query, [supplier_id]);
  return result.rows;
};

/**
 * Get RFQ by ID (Detailed)
 */
const getRFQById = async (rfq_id) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const rfqResult = await client.query(
      `SELECT * FROM rfqs WHERE id = $1`,
      [rfq_id]
    );

    if (!rfqResult.rows.length) {
      await client.query("ROLLBACK");
      return null;
    }

    const rfq = rfqResult.rows[0];

    // Attach files
    const filesResult = await client.query(
      `SELECT id, file_name, file_type, file_url, uploaded_at
       FROM rfq_files
       WHERE rfq_id = $1`,
      [rfq_id]
    );

    rfq.files = filesResult.rows;

    // Attach quotes
    const quotesResult = await client.query(
      `SELECT id, supplier_id, price, status, created_at
       FROM quotes
       WHERE rfq_id = $1`,
      [rfq_id]
    );

    rfq.quotes = quotesResult.rows;

    await client.query("COMMIT");

    return rfq;

  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  createRFQ,
  getRFQsByBuyer,
  getRFQsForSupplier,
  getRFQById
};
