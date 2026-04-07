const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const Price = require('../models/Price');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 1024 * 1024 // 1MB limit
  }
});
router.post('/', auth, requireRole(['agent', 'admin']), async (req, res) => {
    try {
        const { crop_id, market_id, price } = req.body;
        
        const priceId = await Price.create({
            crop_id,
            market_id,
            price,
            agent_id: req.user.id
        });

        // Get the created price with full details
        const newPrice = await Price.findById(priceId);

        // Emit real-time update to all connected clients
        const io = req.app.get('io');
        io.emit('priceUpdate', {
            type: 'CREATE',
            price: newPrice
        });

        // Trigger price alerts to subscribed users
        try {
            const Subscription = require('../models/Subscription');
            const subscribers = await Subscription.findSubscribedUsers(crop_id, market_id);
            if (subscribers.length > 0) {
                console.log(`📱 Price alerts triggered for ${subscribers.length} subscribers`);
                // Emit personalized alerts to subscribed users
                subscribers.forEach(userId => {
                    io.to(`user_${userId}`).emit('priceAlert', {
                        crop_id,
                        market_id,
                        price,
                        message: `New price update for your subscribed crop!`
                    });
                });
            }
        } catch (error) {
            console.log('Note: Could not send price alerts', error.message);
        }
        
        res.status(201).json({ 
            id: priceId, 
            message: 'Price added successfully! Alerts sent to subscribed farmers.' 
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get all prices
router.get('/', async (req, res) => {
    try {
        const prices = await Price.findAll();
        res.json(prices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get prices by crop
router.get('/crop/:cropId', async (req, res) => {
    try {
        const prices = await Price.findByCrop(req.params.cropId);
        res.json(prices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get agent's own prices
router.get('/my-prices', auth, requireRole(['agent']), async (req, res) => {
    try {
        const prices = await Price.findByAgent(req.user.id);
        res.json(prices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get historical prices with filtering
router.get('/history', async (req, res) => {
    try {
        const { cropId, marketId, days } = req.query;
        const prices = await Price.findHistorical(
            cropId || null,
            marketId || null,
            parseInt(days) || 30
        );
        res.json(prices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update price (AGENT/ADMIN only)
router.put('/:id', auth, requireRole(['agent', 'admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { price } = req.body;
        
        const existingPrice = await Price.findById(id);
        if (!existingPrice) {
            return res.status(404).json({ error: 'Price not found' });
        }
        
        // Allow agents to only update their own prices, admins can update any
        if (req.user.role === 'agent' && existingPrice.agent_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        const success = await Price.update(id, price);
        if (!success) {
            return res.status(400).json({ error: 'Failed to update price' });
        }

        // Get updated price
        const updatedPrice = await Price.findById(id);

        // Emit real-time update
        const io = req.app.get('io');
        io.emit('priceUpdate', {
            type: 'UPDATE',
            price: updatedPrice
        });

        res.json({ message: 'Price updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete price (AGENT/ADMIN only)
router.delete('/:id', auth, requireRole(['agent', 'admin']), async (req, res) => {
    try {
        const { id } = req.params;
        
        const existingPrice = await Price.findById(id);
        if (!existingPrice) {
            return res.status(404).json({ error: 'Price not found' });
        }
        
        // Allow agents to only delete their own prices, admins can delete any
        if (req.user.role === 'agent' && existingPrice.agent_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        const success = await Price.delete(id);
        if (!success) {
            return res.status(400).json({ error: 'Failed to delete price' });
        }

        // Emit real-time update
        const io = req.app.get('io');
        io.emit('priceUpdate', {
            type: 'DELETE',
            priceId: id
        });

        res.json({ message: 'Price deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 1024 * 1024 // 1MB limit
  }
});

// Bulk upload prices from CSV (AGENT/ADMIN only)
router.post('/bulk', auth, requireRole(['agent', 'admin']), upload.single('csvFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No CSV file uploaded' });
  }

  const results = {
    processed: 0,
    errors: [],
    success: true
  };

  try {
    const prices = [];
    const Crop = require('../models/Crop');
    const Market = require('../models/Market');

    // Read and parse CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => {
          prices.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Validate and process each price
    for (let i = 0; i < prices.length; i++) {
      const row = prices[i];
      const rowNum = i + 2; // +2 because of 0-index and header row

      try {
        const { crop_name, market_name, price } = row;

        // Validate required fields
        if (!crop_name || !market_name || !price) {
          results.errors.push(`Row ${rowNum}: Missing required fields (crop_name, market_name, price)`);
          continue;
        }

        // Validate price is a number
        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum <= 0) {
          results.errors.push(`Row ${rowNum}: Invalid price value`);
          continue;
        }

        // Check if crop exists
        const crops = await Crop.findAll();
        const crop = crops.find(c => c.name.toLowerCase() === crop_name.toLowerCase());
        if (!crop) {
          results.errors.push(`Row ${rowNum}: Crop "${crop_name}" not found`);
          continue;
        }

        // Check if market exists
        const markets = await Market.findAll();
        const market = markets.find(m => m.name.toLowerCase() === market_name.toLowerCase());
        if (!market) {
          results.errors.push(`Row ${rowNum}: Market "${market_name}" not found`);
          continue;
        }

        // Create the price
        await Price.create({
          crop_id: crop.id,
          market_id: market.id,
          price: priceNum,
          agent_id: req.user.id
        });

        results.processed++;

      } catch (error) {
        results.errors.push(`Row ${rowNum}: ${error.message}`);
      }
    }

    // Emit real-time update for all processed prices
    if (results.processed > 0) {
      const io = req.app.get('io');
      io.emit('priceUpdate', {
        type: 'BULK_CREATE',
        count: results.processed
      });
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    if (results.errors.length > 0) {
      results.success = false;
      results.message = `Processed ${results.processed} prices with ${results.errors.length} errors`;
    } else {
      results.message = `Successfully uploaded ${results.processed} prices`;
    }

    res.json(results);

  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error('Bulk upload error:', error);
    res.status(500).json({
      error: 'Failed to process CSV file',
      details: error.message
    });
  }
});

module.exports = router;