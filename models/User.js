const db = require('../config/database');

class User {
    static async findByPhone(phone) {
        const [rows] = await db.execute('SELECT * FROM users WHERE phone = ?', [phone]);
        return rows[0];
    }

    static async create(userData) {
        const [result] = await db.execute(
            'INSERT INTO users (name, phone, email, role, location) VALUES (?, ?, ?, ?, ?)',
            [userData.name, userData.phone, userData.email || null, userData.role, userData.location || null]
        );
        return result.insertId;
    }

    static async findAll() {
        const [rows] = await db.execute('SELECT id, name, phone, email, role, location, created_at FROM users ORDER BY created_at DESC');
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
        return rows[0];
    }

    static async findAllByRole(role) {
        const [rows] = await db.execute('SELECT * FROM users WHERE role = ?', [role]);
        return rows;
    }

    static async update(id, userData) {
        const [result] = await db.execute(
            'UPDATE users SET name = ?, phone = ?, email = ?, role = ?, location = ? WHERE id = ?',
            [userData.name, userData.phone, userData.email || null, userData.role, userData.location || null, id]
        );
        return result.affectedRows > 0;
    }

    static async delete(id) {
        await db.execute('DELETE FROM users WHERE id = ?', [id]);
    }
}

module.exports = User;