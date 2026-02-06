const express = require("express");
const router = express.Router();

const rfqController = require("../src/controllers/rfq.controller");

/**
 * @swagger
 * tags:
 *   name: RFQs
 *   description: Request For Quotation management
 */

/**
 * @swagger
 * /rfqs:
 *   post:
 *     summary: Create a new RFQ (Draft)
 *     tags: [RFQs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - buyer_id
 *               - part_name
 *               - part_id
 *               - total_quantity
 *               - batch_quantity
 *               - delivery_timeline
 *               - material_specification
 *               - ppap_level
 *             properties:
 *               buyer_id:
 *                 type: integer
 *                 example: 1
 *               part_name:
 *                 type: string
 *                 example: EV Battery Case
 *               part_id:
 *                 type: string
 *                 example: EV-BC-001
 *               total_quantity:
 *                 type: integer
 *                 example: 5000
 *               batch_quantity:
 *                 type: integer
 *                 example: 500
 *               target_price:
 *                 type: number
 *                 example: 250000
 *               delivery_timeline:
 *                 type: string
 *                 example: 60 days
 *               material_specification:
 *                 type: string
 *                 example: Aluminium
 *               ppap_level:
 *                 type: string
 *                 example: Level 3
 *     responses:
 *       201:
 *         description: RFQ created successfully
 *       500:
 *         description: Server error
 */
router.post("/", rfqController.createRFQ);

/**
 * @swagger
 * /rfqs:
 *   get:
 *     summary: Get RFQs by buyer
 *     tags: [RFQs]
 *     parameters:
 *       - in: query
 *         name: buyer_id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: List of RFQs
 *       400:
 *         description: buyer_id missing
 */
router.get("/", rfqController.getRFQsByBuyer);

/**
 * @swagger
 * /rfqs/{id}:
 *   get:
 *     summary: Get RFQ details by ID
 *     tags: [RFQs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: RFQ details
 *       404:
 *         description: RFQ not found
 */
router.get("/:id", rfqController.getRFQById);

module.exports = router;
