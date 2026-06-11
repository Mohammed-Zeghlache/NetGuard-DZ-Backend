const express = require('express');
const pool = require('./../config/db'); 
const router = express.Router();

// Generate unique ticket number
function generateTicketNumber() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TKT-${year}${month}${day}-${random}`;
}

// Create ticket from chatbot (from your Chatboot.js)
router.post('/chatbot', async (req, res) => {
  const {
    fullName, phone, location, problemType, problemDescription, priority, source
  } = req.body;
  
  const ticketNumber = generateTicketNumber();
  
  try {
    // Find user by phone
    const userResult = await pool.query(
      'SELECT id FROM users WHERE phone_number = $1',
      [phone]
    );
    
    let userId = null;
    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].id;
    }
    
    const result = await pool.query(
      `INSERT INTO tickets 
       (ticket_number, user_id, full_name, phone, location, 
        problem_type, problem_description, priority, source, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'nouveau')
       RETURNING *`,
      [ticketNumber, userId, fullName, phone, location,
       problemType, problemDescription, priority || 'medium', source || 'chatbot']
    );
    
    res.json({ 
      success: true, 
      ticketNumber: result.rows[0].ticket_number,
      message: 'Ticket créé avec succès!'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all tickets (for admin)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tickets ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update ticket status
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, assignedTechnicianId } = req.body;
  
  try {
    await pool.query(
      'UPDATE tickets SET status = $1, assigned_technician_id = $2, updated_at = NOW() WHERE id = $3',
      [status, assignedTechnicianId, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;