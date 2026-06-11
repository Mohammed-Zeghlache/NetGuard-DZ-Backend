// middleware/role.js
const isAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }
    next();
};

const isUser = (req, res, next) => {
    if (req.user?.role !== 'user') {
        return res.status(403).json({ message: 'Accès réservé aux utilisateurs' });
    }
    next();
};

module.exports = { isAdmin, isUser };