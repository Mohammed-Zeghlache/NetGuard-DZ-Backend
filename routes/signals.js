const express = require('express');
const pool = require('./../config/db'); 
const router = express.Router();

// Generate unique signal number
function generateSignalNumber() {
  const date = new Date();
  const timestamp = date.getFullYear().toString().slice(-2) +
    (date.getMonth() + 1).toString().padStart(2, '0') +
    date.getDate().toString().padStart(2, '0') +
    date.getHours().toString().padStart(2, '0') +
    date.getMinutes().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `SIG-${timestamp}-${random}`;
}

// Create new signal (from your UserSignal.js)
router.post('/', async (req, res) => {
  const {
    phoneNumber, clientCode, problemType, problemTitle, subProblem,
    subProblemLabel, description, priority, contactMethod,
    availableTimes, wilaya, commune, address, lat, lng
  } = req.body;
  
  const signalNumber = generateSignalNumber();
  
  try {
    // Get user by phone number
    const userResult = await pool.query(
      'SELECT id FROM users WHERE phone_number = $1',
      [phoneNumber]
    );
    
    let userId = null;
    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].id;
    }
    
    const result = await pool.query(
      `INSERT INTO signals 
       (signal_number, user_id, phone_number, client_code, problem_type, 
        problem_title, sub_problem, sub_problem_label, description, priority, 
        contact_method, available_times, wilaya, commune, address, 
        latitude, longitude, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'nouveau')
       RETURNING *`,
      [signalNumber, userId, phoneNumber, clientCode, problemType,
       problemTitle, subProblem, subProblemLabel, description, priority,
       contactMethod, availableTimes, wilaya, commune, address,
       lat, lng]
    );
    
    res.json({ 
      success: true, 
      signal: result.rows[0],
      message: 'Signalement envoyé avec succès!'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all signals (for admin)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM signals ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's signals
router.get('/user/:phone', async (req, res) => {
  const { phone } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT * FROM signals WHERE phone_number = $1 ORDER BY created_at DESC',
      [phone]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update signal status
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, assignedTechnicianId } = req.body;
  
  try {
    await pool.query(
      'UPDATE signals SET status = $1, assigned_technician_id = $2, updated_at = NOW() WHERE id = $3',
      [status, assignedTechnicianId, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;