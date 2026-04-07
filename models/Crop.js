const db = require('../config/database');

class Crop {
    static async findAll() {
        const [rows] = await db.execute('SELECT * FROM crops ORDER BY name');
        return rows;
    }

    static async create(cropData) {
        const [result] = await db.execute(
            'INSERT INTO crops (name) VALUES (?)',
            [cropData.name]
        );
        return result.insertId;
    }

    static async update(cropId, cropData) {
        const [result] = await db.execute(
            'UPDATE crops SET name = ? WHERE id = ?',
            [cropData.name, cropId]
        );
        return result.affectedRows > 0;
    }

    static async delete(cropId) {
        const [result] = await db.execute(
            'DELETE FROM crops WHERE id = ?',
            [cropId]
        );
        return result.affectedRows > 0;
    }

    static async findById(cropId) {
        const [rows] = await db.execute(
            'SELECT * FROM crops WHERE id = ?',
            [cropId]
        );
        return rows[0];
    }
}

module.exports = Crop;