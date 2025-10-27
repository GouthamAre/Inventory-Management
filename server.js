const express = require('express');
const cors = require('cors');
const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Health check route
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// API routes
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);

// Simple admin auth placeholder (not for production use)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password]
    );
    if (rows.length === 0)
      return res.status(401).json({ error: 'Invalid credentials' });

    res.json({ success: true, user: { id: rows[0].id, username: rows[0].username } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Root route (to verify server is running)
app.get('/', (req, res) => {
  res.send('✅ Inventory Management System backend is running successfully...');
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Inventory backend running on port ${PORT}`));
