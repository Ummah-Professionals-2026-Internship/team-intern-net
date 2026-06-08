const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: "success",
      message: "Express backend connected to database successfully!", 
      db_time: result.rows[0].now 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: "error", message: "Database connection failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});