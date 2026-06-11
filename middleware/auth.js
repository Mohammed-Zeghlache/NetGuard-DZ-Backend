const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'Accès non autorisé' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'netguard_secret_key_2024');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token invalide' });
  }
};

module.exports = auth;