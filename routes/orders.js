const express = require('express');
const router = express.Router();
const db = require('../db');

// create order: body { items: [{product_id, quantity}], optional: total }
router.post('/', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items required' });
    }

    await conn.beginTransaction();

    // compute total and check stock
    let total = 0;
    for (const it of items) {
      const [prodRows] = await conn.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [it.product_id]);
      const product = prodRows[0];
      if (!product) {
        throw new Error(`Product id ${it.product_id} not found`);
      }
      if (product.quantity < it.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }
      total += Number(product.price) * Number(it.quantity);
    }

    const [orderRes] = await conn.query('INSERT INTO orders (total) VALUES (?)', [total]);
    const orderId = orderRes.insertId;

    // insert items and update stock
    for (const it of items) {
      const [prodRows] = await conn.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [it.product_id]);
      const product = prodRows[0];

      await conn.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, it.product_id, it.quantity, product.price]
      );

      await conn.query('UPDATE products SET quantity = quantity - ? WHERE id = ?', [it.quantity, it.product_id]);
    }

    await conn.commit();

    const [orderRows] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    res.status(201).json({ order: orderRows[0], id: orderId });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// get orders with items
router.get('/', async (req, res) => {
  try {
    const [orders] = await db.query('SELECT * FROM orders ORDER BY order_date DESC');
    const results = [];
    for (const o of orders) {
      const [items] = await db.query(
        `SELECT oi.id, oi.product_id, p.name, oi.quantity, oi.price
         FROM order_items oi
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = ?`,
        [o.id]
      );
      results.push({ ...o, items });
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
