const jwt = require('jsonwebtoken');
const db = require('../config/database');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: 'No token provided' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [decoded.id]);
        
        if (rows.length === 0) return res.status(401).json({ error: 'User not found' });
        
        req.user = rows[0];
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

const requireRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: `Role ${req.user.role} not authorized` });
        }
        next();
    };
};

module.exports = { auth, requireRole };