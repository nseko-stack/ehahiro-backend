const express = require('express');
const Crop = require('../models/Crop');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const crops = await Crop.findAll();
        res.json(crops);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', auth, requireRole(['admin']), async (req, res) => {
    try {
        const cropId = await Crop.create(req.body);
        res.status(201).json({ id: cropId, message: 'Crop added successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.put('/:id', auth, requireRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const success = await Crop.update(id, req.body);
        if (!success) {
            return res.status(404).json({ error: 'Crop not found' });
        }
        res.json({ message: 'Crop updated successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.delete('/:id', auth, requireRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const success = await Crop.delete(id);
        if (!success) {
            return res.status(404).json({ error: 'Crop not found' });
        }
        res.json({ message: 'Crop deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;