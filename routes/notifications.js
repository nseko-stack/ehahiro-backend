const express = require('express');
const AT = process.env.AT_USERNAME ? require('africastalking')({
    apiKey: process.env.AT_API_KEY,
    username: process.env.AT_USERNAME
  }) : null;
const { auth, requireRole } = require('../middleware/auth');
const db = require('../config/database');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Subscription = require('../models/Subscription');
const router = express.Router();

router.post('/sms', auth, async (req, res) => {
    try {
        const { phone, message } = req.body;
        if (AT) {
          const sms = AT.SMS;
          await sms.send({
            to: phone,
            message: `📈 Agri-Price Tracker: ${message}`
          });
        } else {
          console.log(`📱 SMS mock: ${message} to ${phone}`);
        }
        
        res.json({ success: true, message: 'SMS sent!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/bulk-sms', auth, requireRole(['admin']), async (req, res) => {
    try {
        const { message } = req.body;
        const farmers = await User.findAllByRole('farmer');
        const phones = farmers.map(f => f.phone);
        const userIds = farmers.map(f => f.id);
        
        if (AT && phones.length > 0) {
          const sms = AT.SMS;
          await sms.send({
            to: phones,
            message: `📈 Agri-Price Tracker: ${message}`
          });
        } else {
          console.log(`📱 Bulk SMS mock: ${message} to ${phones.length} farmers`);
        }
        
        // Create in-app notifications for all farmers
        await Notification.createBulk(userIds, message, 'sms');
        
        res.json({ success: true, message: `Bulk SMS sent to ${phones.length} farmers!` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/price-alert/:cropId/:marketId', auth, requireRole(['agent', 'admin']), async (req, res) => {
    try {
        const { cropId, marketId } = req.params;
        const { price } = req.body;
        
        // Get all users subscribed to this crop/market combo
        const subscribers = await Subscription.findSubscribedUsers(cropId, marketId);
        const userIds = subscribers.map(s => s.id);
        const phones = subscribers.map(s => s.phone);
        
        if (phones.length === 0) {
            return res.json({ message: 'No subscribers to notify' });
        }
        
        const message = `Price update: This item is now RWF ${price}/kg. Check the app for details!`;
        
        if (AT && phones.length > 0) {
          const sms = AT.SMS;
          await sms.send({
            to: phones,
            message: `📈 Agri-Price Tracker: ${message}`
          });
        } else {
          console.log(`📱 Price alert SMS mock: ${message} to ${phones.length} subscribers`);
        }
        
        // Create in-app notifications
        await Notification.createBulk(userIds, message, 'price_alert');
        
        res.json({ 
            success: true, 
            message: `Price alert sent to ${subscribers.length} subscribers!` 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await Notification.findByUserId(userId);
        const unreadCount = await Notification.getUnreadCount(userId);
        res.json({
            notifications,
            unreadCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark notification as read
router.put('/:id/read', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const success = await Notification.markAsRead(id, req.user.id);
        if (!success) {
            return res.status(404).json({ error: 'Notification not found or already read' });
        }
        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark all notifications as read
router.put('/read-all', auth, async (req, res) => {
    try {
        const count = await Notification.markAllAsRead(req.user.id);
        res.json({ message: `Marked ${count} notifications as read` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get unread count
router.get('/unread-count', auth, async (req, res) => {
    try {
        const count = await Notification.getUnreadCount(req.user.id);
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all notifications (ADMIN only)
router.get('/admin/all', auth, requireRole(['admin']), async (req, res) => {
    try {
        const { page = 1, limit = 50, type, userId } = req.query;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT n.*, u.name as user_name, u.phone FROM notifications n JOIN users u ON n.user_id = u.id';
        let params = [];
        
        if (type) {
            query += ' WHERE n.type = ?';
            params.push(type);
        }
        
        if (userId) {
            query += type ? ' AND' : ' WHERE';
            query += ' n.user_id = ?';
            params.push(userId);
        }
        
        query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [rows] = await db.execute(query, params);
        
        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM notifications n';
        if (type || userId) {
            countQuery += ' WHERE';
            if (type) countQuery += ' n.type = ?';
            if (userId) countQuery += (type ? ' AND' : '') + ' n.user_id = ?';
        }
        
        const [countRows] = await db.execute(countQuery, params.slice(0, -2)); // Remove limit and offset
        
        res.json({
            notifications: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countRows[0].total,
                pages: Math.ceil(countRows[0].total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;