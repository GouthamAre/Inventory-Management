const express = require('express');
const router = express.Router();
const db = require('../db');

// get all products (with optional search / low-stock filter)
router.get('/', async (req, res) => {
  try {
    const { search, lowStock } = req.query;
    let sql = 'SELECT * FROM products';
    const params = [];
    if (search) {
      sql += ' WHERE name LIKE ? OR category LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    } else if (lowStock === 'true') {
      sql += ' WHERE quantity < ?';
      params.push(10); // default threshold
    }
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// add product
router.post('/', async (req, res) => {
  try {
    const { name, category, price = 0, quantity = 0 } = req.body;
    const [result] = await db.query(
      'INSERT INTO products (name, category, price, quantity) VALUES (?, ?, ?, ?)',
      [name, category, price, quantity]
    );
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// update product
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { name, category, price, quantity } = req.body;
    await db.query(
      'UPDATE products SET name = ?, category = ?, price = ?, quantity = ? WHERE id = ?',
      [name, category, price, quantity, id]
    );
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// delete product
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await db.query('DELETE FROM products WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
