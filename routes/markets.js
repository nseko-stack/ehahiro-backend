const express = require('express');
const Market = require('../models/Market');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const markets = await Market.findAll();
        res.json(markets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', auth, requireRole(['admin']), async (req, res) => {
    try {
        const marketId = await Market.create(req.body);
        res.status(201).json({ id: marketId, message: 'Market added successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.put('/:id', auth, requireRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const success = await Market.update(id, req.body);
        if (!success) {
            return res.status(404).json({ error: 'Market not found' });
        }
        res.json({ message: 'Market updated successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.delete('/:id', auth, requireRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const success = await Market.delete(id);
        if (!success) {
            return res.status(404).json({ error: 'Market not found' });
        }
        res.json({ message: 'Market deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;