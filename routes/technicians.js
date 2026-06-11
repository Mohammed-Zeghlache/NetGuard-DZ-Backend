const express = require('express');
const pool = require('./../config/db'); 
const router = express.Router();

// Get all technicians (from your Technicien.js)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM technicians ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get technician by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('SELECT * FROM technicians WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Technician not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add new technician (from your modal form)
router.post('/', async (req, res) => {
  const {
    name, email, phone, specialty, vehicle, vehiclePlate,
    workZone, status, hireDate, experience, notes
  } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO technicians 
       (full_name, email, phone, specialty, vehicle, vehicle_plate, 
        work_zone, status, hire_date, experience, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING *`,
      [name, email, phone, specialty, vehicle, vehiclePlate,
       workZone, status, hireDate, experience, notes]
    );
    
    res.json({ success: true, technician: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update technician status
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, currentLocation } = req.body;
  
  try {
    await pool.query(
      'UPDATE technicians SET status = $1, current_location = $2, last_active = NOW() WHERE id = $3',
      [status, currentLocation, id]
    );
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete technician
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    await pool.query('DELETE FROM technicians WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;