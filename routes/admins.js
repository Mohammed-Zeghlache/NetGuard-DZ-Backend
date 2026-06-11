const express = require('express');
const pool = require('./../config/db'); 
const router = express.Router();

// Admin signup (from your AdminSignUp.js)
router.post('/signup', async (req, res) => {
  const { fullName, password } = req.body;
  const username = fullName; // Using fullName as username like your frontend
  
  try {
    // Check if admin exists
    const existing = await pool.query(
      'SELECT * FROM admins WHERE username = $1',
      [username]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Admin already exists' });
    }
    
    // Create new admin
    const result = await pool.query(
      'INSERT INTO admins (full_name, username, password) VALUES ($1, $2, $3) RETURNING id, full_name, username',
      [fullName, username, password]
    );
    
    res.json({ 
      success: true, 
      admin: result.rows[0],
      message: 'Admin account created successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin login (from your AdminLogin.js)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const result = await pool.query(
      'SELECT * FROM admins WHERE username = $1 AND password = $2',
      [username, password]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const admin = result.rows[0];
    
    res.json({
      success: true,
      admin: {
        id: admin.id,
        fullName: admin.full_name,
        username: admin.username,
        role: 'admin'
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;