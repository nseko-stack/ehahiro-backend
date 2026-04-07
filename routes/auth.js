const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { name, phone, role, location } = req.body;
        const trimmedPhone = phone.replace(/\s+/g, ''); // Remove spaces
        
        // Check if user exists
        const existingUser = await User.findByPhone(trimmedPhone);
        if (existingUser) {
            return res.status(400).json({ error: 'Phone number already registered' });
        }

        const userId = await User.create({ name, phone: trimmedPhone, role, location });
        const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        res.status(201).json({ 
            token, 
            user: { id: userId, name, phone: trimmedPhone, role } 
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { phone } = req.body;
        const trimmedPhone = phone.replace(/\s+/g, ''); // Remove spaces
        console.log('Login attempt with phone:', trimmedPhone);
        const user = await User.findByPhone(trimmedPhone);
        console.log('User found:', user ? user.name : 'null');
        
        if (!user) {
            return res.status(400).json({ error: 'Invalid phone number' });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ 
            token, 
            user: { id: user.id, name: user.name, role: user.role } 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;