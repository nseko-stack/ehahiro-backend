const express = require('express');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const db = require('../config/database');
const router = express.Router();

router.get('/', auth, requireRole(['admin']), async (req, res) => {
    try {
        const users = await User.findAll();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/stats', auth, requireRole(['admin']), async (req, res) => {
    try {
        const [farmers] = await db.execute("SELECT COUNT(*) as count FROM users WHERE role = 'farmer'");
        const [agents] = await db.execute("SELECT COUNT(*) as count FROM users WHERE role = 'agent'");
        const [pricesToday] = await db.execute("SELECT COUNT(*) as count FROM prices WHERE DATE(date) = CURDATE()");
        const [smsToday] = await db.execute("SELECT COUNT(*) as count FROM notifications WHERE type = 'sms' AND DATE(created_at) = CURDATE()");
        const [avgMaize] = await db.execute("SELECT AVG(price) as avg FROM prices p JOIN crops c ON p.crop_id = c.id WHERE c.name = 'Maize' AND DATE(p.date) = CURDATE()");
        
        res.json({
            totalFarmers: farmers[0].count,
            totalAgents: agents[0].count,
            totalPricesToday: pricesToday[0].count,
            smsSentToday: smsToday[0].count,
            avgMaizePrice: Math.round(avgMaize[0].avg || 0)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get recent activity (ADMIN only)
router.get('/activity', auth, requireRole(['admin']), async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        // Get recent user registrations
        const [newUsers] = await db.execute(
            'SELECT id, name, role, created_at, "user_registration" as type FROM users ORDER BY created_at DESC LIMIT ?',
            [parseInt(limit)]
        );
        
        // Get recent price updates
        const [priceUpdates] = await db.execute(`
            SELECT p.id, c.name as crop_name, m.name as market_name, p.price, p.date, u.name as agent_name, "price_update" as type
            FROM prices p
            JOIN crops c ON p.crop_id = c.id
            JOIN markets m ON p.market_id = m.id
            JOIN users u ON p.agent_id = u.id
            ORDER BY p.date DESC LIMIT ?
        `, [parseInt(limit)]);
        
        // Get recent notifications
        const [notifications] = await db.execute(`
            SELECT n.id, n.message, n.type, n.created_at, u.name as user_name, "notification" as activity_type
            FROM notifications n
            JOIN users u ON n.user_id = u.id
            ORDER BY n.created_at DESC LIMIT ?
        `, [parseInt(limit)]);
        
        // Combine and sort by date
        const activities = [
            ...newUsers.map(u => ({ ...u, timestamp: u.created_at })),
            ...priceUpdates.map(p => ({ ...p, timestamp: p.date })),
            ...notifications.map(n => ({ ...n, timestamp: n.created_at, type: n.activity_type }))
        ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, parseInt(limit));
        
        res.json(activities);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', auth, requireRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        await User.delete(id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', auth, requireRole(['admin']), async (req, res) => {
    try {
        const { name, phone, email, role, location } = req.body;
        if (!name || !phone || !role) {
            return res.status(400).json({ error: 'Name, phone and role are required' });
        }

        const trimmedPhone = phone.replace(/\s+/g, '');
        const existingUser = await User.findByPhone(trimmedPhone);
        if (existingUser) {
            return res.status(400).json({ error: 'Phone number already registered' });
        }

        const userId = await User.create({ name, phone: trimmedPhone, email, role, location });
        const createdUser = await User.findById(userId);
        res.status(201).json({ message: 'User created successfully', user: createdUser });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/:id', auth, requireRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, role, location } = req.body;
        const trimmedPhone = phone.replace(/\s+/g, '');
        const success = await User.update(id, { name, phone: trimmedPhone, role, location });
        if (!success) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;