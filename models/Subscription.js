const db = require('../config/database');

class Subscription {
    static async create(userId, cropId, marketId) {
        const [result] = await db.execute(
            'INSERT INTO subscriptions (user_id, crop_id, market_id) VALUES (?, ?, ?)',
            [userId, cropId, marketId]
        );
        return result.insertId;
    }

    static async findByUserId(userId) {
        const [rows] = await db.execute(`
            SELECT s.*, c.name as crop_name, m.name as market_name, m.location
            FROM subscriptions s
            JOIN crops c ON s.crop_id = c.id
            JOIN markets m ON s.market_id = m.id
            WHERE s.user_id = ?
        `, [userId]);
        return rows;
    }

    static async delete(subscriptionId) {
        const [result] = await db.execute(
            'DELETE FROM subscriptions WHERE id = ?',
            [subscriptionId]
        );
        return result.affectedRows > 0;
    }

    static async findSubscribedUsers(cropId, marketId) {
        const [rows] = await db.execute(`
            SELECT DISTINCT u.id, u.name, u.phone
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            WHERE s.crop_id = ? AND s.market_id = ?
        `, [cropId, marketId]);
        return rows;
    }

    static async exists(userId, cropId, marketId) {
        const [rows] = await db.execute(
            'SELECT id FROM subscriptions WHERE user_id = ? AND crop_id = ? AND market_id = ?',
            [userId, cropId, marketId]
        );
        return rows.length > 0;
    }
}

module.exports = Subscription;
