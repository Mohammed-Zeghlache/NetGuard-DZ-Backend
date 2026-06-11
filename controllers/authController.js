const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// ==================== ADMIN AUTH ====================

// Admin Signup
const adminSignup = async (req, res) => {
  const { fullName, username, password } = req.body;
  
  try {
    // Check if admin already exists
    const existingAdmin = await db.query(
      'SELECT * FROM admins WHERE username = $1',
      [username || fullName]
    );
    
    if (existingAdmin.rows.length > 0) {
      return res.status(400).json({ message: 'Ce nom d\'utilisateur existe déjà' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new admin
    const result = await db.query(
      'INSERT INTO admins (full_name, username, password_hash) VALUES ($1, $2, $3) RETURNING id, full_name, username',
      [fullName, username || fullName, hashedPassword]
    );
    
    const admin = result.rows[0];
    
    // Create JWT token
    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      success: true,
      token,
      admin: {
        id: admin.id,
        fullName: admin.full_name,
        username: admin.username,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Admin signup error:', error);
    res.status(500).json({ message: 'Erreur lors de l\'inscription' });
  }
};

// Admin Login
const adminLogin = async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Find admin by username
    const result = await db.query(
      'SELECT * FROM admins WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Nom d\'utilisateur ou mot de passe incorrect' });
    }
    
    const admin = result.rows[0];
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Nom d\'utilisateur ou mot de passe incorrect' });
    }
    
    // Create JWT token
    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        fullName: admin.full_name,
        username: admin.username,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Erreur lors de la connexion' });
  }
};

// ==================== USER AUTH ====================

// User Signup
const userSignup = async (req, res) => {
  const { fullName, email, phoneNumber } = req.body;
  
  try {
    // Check if user already exists
    const existingUser = await db.query(
      'SELECT * FROM users WHERE email = $1 OR phone_number = $2',
      [email, phoneNumber]
    );
    
    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      if (user.email === email) {
        return res.status(400).json({ message: 'Un compte existe déjà avec cet email' });
      }
      if (user.phone_number === phoneNumber) {
        return res.status(400).json({ message: 'Un compte existe déjà avec ce numéro de téléphone' });
      }
    }
    
    // Create new user
    const result = await db.query(
      'INSERT INTO users (full_name, email, phone_number) VALUES ($1, $2, $3) RETURNING id, full_name, email, phone_number',
      [fullName, email, phoneNumber]
    );
    
    const user = result.rows[0];
    
    // Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Create welcome notifications
    const notifications = [
      { message: `Bienvenue ${fullName} ! 🎉`, icon: "🎉" },
      { message: "Votre compte a été créé avec succès. Vous pouvez maintenant créer des signalements.", icon: "✅" },
      { message: "L'assistant IA est disponible pour vous aider 24/7", icon: "🤖" }
    ];
    
    for (const notif of notifications) {
      await db.query(
        'INSERT INTO notifications (user_id, message, icon, type) VALUES ($1, $2, $3, $4)',
        [user.id, notif.message, notif.icon, 'welcome']
      );
    }
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone_number
      }
    });
  } catch (error) {
    console.error('User signup error:', error);
    res.status(500).json({ message: 'Erreur lors de l\'inscription' });
  }
};

// User Login
const userLogin = async (req, res) => {
  const { email, phoneNumber } = req.body;
  
  try {
    // Find user by email and phone
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1 AND phone_number = $2',
      [email, phoneNumber]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Email ou numéro de téléphone incorrect' });
    }
    
    const user = result.rows[0];
    
    // Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone_number
      }
    });
  } catch (error) {
    console.error('User login error:', error);
    res.status(500).json({ message: 'Erreur lors de la connexion' });
  }
};

// Get current user (for both admin and user)
const getMe = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const result = await db.query(
        'SELECT id, full_name, username FROM admins WHERE id = $1',
        [req.user.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Admin non trouvé' });
      }
      const admin = result.rows[0];
      res.json({
        id: admin.id,
        fullName: admin.full_name,
        username: admin.username,
        role: 'admin'
      });
    } else {
      const result = await db.query(
        'SELECT id, full_name, email, phone_number FROM users WHERE id = $1',
        [req.user.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }
      const user = result.rows[0];
      res.json({
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone_number,
        role: 'user'
      });
    }
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = {
  adminSignup,
  adminLogin,
  userSignup,
  userLogin,
  getMe
};