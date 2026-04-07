const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const Crop = require('../models/Crop');
const Market = require('../models/Market');
const router = express.Router();

// Get user's subscriptions
router.get('/', auth, async (req, res) => {
    try {
        const subscriptions = await Subscription.findByUserId(req.user.id);
        res.json(subscriptions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create subscription
router.post('/', auth, requireRole(['farmer']), async (req, res) => {
    try {
        const { crop_id, market_id } = req.body;
        
        // Validate required fields
        if (!crop_id || !market_id) {
            return res.status(400).json({ error: 'crop_id and market_id are required' });
        }
        
        // Validate crop exists
        const crop = await Crop.findById(crop_id);
        if (!crop) {
            return res.status(400).json({ error: 'Invalid crop_id' });
        }
        
        // Validate market exists
        const market = await Market.findById(market_id);
        if (!market) {
            return res.status(400).json({ error: 'Invalid market_id' });
        }
        
        // Check if already subscribed
        const exists = await Subscription.exists(req.user.id, crop_id, market_id);
        if (exists) {
            return res.status(400).json({ error: 'Already subscribed to this crop at this market' });
        }
        
        const subscriptionId = await Subscription.create(req.user.id, crop_id, market_id);
        res.status(201).json({ 
            id: subscriptionId, 
            message: 'Subscribed successfully! You will receive price alerts for this crop at this market.' 
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete subscription
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const success = await Subscription.delete(id);
        if (!success) {
            return res.status(404).json({ error: 'Subscription not found' });
        }
        res.json({ message: 'Unsubscribed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
