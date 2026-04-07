const db = require('../config/database');

class Market {
    static async findAll() {
        const [rows] = await db.execute('SELECT * FROM markets ORDER BY name');
        return rows;
    }

    static async create(marketData) {
        const [result] = await db.execute(
            'INSERT INTO markets (name, location) VALUES (?, ?)',
            [marketData.name, marketData.location]
        );
        return result.insertId;
    }

    static async update(marketId, marketData) {
        const [result] = await db.execute(
            'UPDATE markets SET name = ?, location = ? WHERE id = ?',
            [marketData.name, marketData.location, marketId]
        );
        return result.affectedRows > 0;
    }

    static async delete(marketId) {
        const [result] = await db.execute(
            'DELETE FROM markets WHERE id = ?',
            [marketId]
        );
        return result.affectedRows > 0;
    }

    static async findById(marketId) {
        const [rows] = await db.execute(
            'SELECT * FROM markets WHERE id = ?',
            [marketId]
        );
        return rows[0];
    }
}

module.exports = Market;