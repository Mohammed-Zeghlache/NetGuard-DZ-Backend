const express = require('express');
const pool = require('./../config/db'); 
const router = express.Router();

// User signup (from your Signin.js)
router.post('/signup', async (req, res) => {
  const { fullName, email, phoneNumber } = req.body;
  
  try {
    // Check if user exists
    const existing = await pool.query(
      'SELECT * FROM users WHERE phone_number = $1 OR email = $2',
      [phoneNumber, email]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create new user
    const result = await pool.query(
      'INSERT INTO users (full_name, email, phone_number) VALUES ($1, $2, $3) RETURNING id, full_name, email, phone_number',
      [fullName, email, phoneNumber]
    );
    
    res.json({ 
      success: true, 
      user: result.rows[0],
      message: 'Account created successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// User login (from your Login.js)
router.post('/login', async (req, res) => {
  const { email, phoneNumber } = req.body;
  
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND phone_number = $2',
      [email, phoneNumber]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Update last login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone_number
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT id, full_name, email, phone_number, created_at FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;