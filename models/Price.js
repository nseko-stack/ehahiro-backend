const db = require('../config/database');

class Price {
    static async create(priceData) {
        const [result] = await db.execute(
            'INSERT INTO prices (crop_id, market_id, price, agent_id) VALUES (?, ?, ?, ?)',
            [priceData.crop_id, priceData.market_id, priceData.price, priceData.agent_id]
        );
        return result.insertId;
    }

    static async findTodayByCropMarket(cropId, marketId) {
        const [rows] = await db.execute(
            'SELECT * FROM prices WHERE crop_id = ? AND market_id = ? AND DATE(date) = CURDATE()',
            [cropId, marketId]
        );
        return rows[0];
    }

    static async upsertToday(cropId, marketId, price, agentId) {
        // Check if exists
        const existing = await this.findTodayByCropMarket(cropId, marketId);
        if (existing) {
            // Update existing
            const [result] = await db.execute(
                'UPDATE prices SET price = ?, agent_id = ?, date = NOW() WHERE id = ?',
                [price, agentId, existing.id]
            );
            return { id: existing.id, updated: true };
        } else {
            // Create new
            return { id: await this.create({ crop_id: cropId, market_id: marketId, price, agent_id: agentId }), updated: false };
        }
    }

    static async findAll() {
        const [rows] = await db.execute(`
            SELECT p.*, 
                   c.name as crop_name, 
                   m.name as market_name, 
                   u.name as agent_name
            FROM prices p
            JOIN crops c ON p.crop_id = c.id
            JOIN markets m ON p.market_id = m.id
            JOIN users u ON p.agent_id = u.id
            ORDER BY p.date DESC 
            LIMIT 50
        `);
        return rows;
    }

    static async findByCrop(cropId) {
        const [rows] = await db.execute(`
            SELECT p.*, m.name as market_name, m.location
            FROM prices p
            JOIN markets m ON p.market_id = m.id
            WHERE p.crop_id = ?
            ORDER BY p.date DESC
        `, [cropId]);
        return rows;
    }

    static async findTodaysPrices() {
        const [rows] = await db.execute(`
            SELECT p.*, c.name as crop_name, m.name as market_name
            FROM prices p
            JOIN crops c ON p.crop_id = c.id
            JOIN markets m ON p.market_id = m.id
            WHERE DATE(p.date) = CURDATE()
            ORDER BY p.price DESC
        `);
        return rows;
    }

    static async findByAgent(agentId) {
        const [rows] = await db.execute(`
            SELECT p.*, c.name as crop_name, m.name as market_name
            FROM prices p
            JOIN crops c ON p.crop_id = c.id
            JOIN markets m ON p.market_id = m.id
            WHERE p.agent_id = ?
            ORDER BY p.date DESC
            LIMIT 20
        `, [agentId]);
        return rows;
    }

    static async findHistorical(cropId = null, marketId = null, days = 30) {
        let query = `
            SELECT p.*, c.name as crop_name, m.name as market_name, m.location
            FROM prices p
            JOIN crops c ON p.crop_id = c.id
            JOIN markets m ON p.market_id = m.id
            WHERE p.date >= DATE_SUB(NOW(), INTERVAL ? DAY)
        `;
        const params = [days];
        if (cropId) {
            query += ` AND p.crop_id = ?`;
            params.push(cropId);
        }
        if (marketId) {
            query += ` AND p.market_id = ?`;
            params.push(marketId);
        }
        query += ` ORDER BY p.date ASC`;
        const [rows] = await db.execute(query, params);
        return rows;
    }

    static async update(priceId, price) {
        const [result] = await db.execute(
            'UPDATE prices SET price = ? WHERE id = ?',
            [price, priceId]
        );
        return result.affectedRows > 0;
    }

    static async delete(priceId) {
        const [result] = await db.execute(
            'DELETE FROM prices WHERE id = ?',
            [priceId]
        );
        return result.affectedRows > 0;
    }

    static async findById(priceId) {
        const [rows] = await db.execute(
            'SELECT * FROM prices WHERE id = ?',
            [priceId]
        );
        return rows[0];
    }
}

module.exports = Price;