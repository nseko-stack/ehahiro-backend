const { supabase } = require('../config/supabase');

class Notification {
    static async create(userId, message, type = 'in_app') {
        const [result] = await db.execute(
            'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
            [userId, message, type]
        );
        return result.insertId;
    }

    static async findByUserId(userId) {
        const [rows] = await db.execute(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [userId]
        );
        return rows;
    }

    static async markAsRead(notificationId, userId) {
        const [result] = await db.execute(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [notificationId, userId]
        );
        return result.affectedRows > 0;
    }

    static async markAllAsRead(userId) {
        const [result] = await db.execute(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );
        return result.affectedRows;
    }

    static async getUnreadCount(userId) {
        const [rows] = await db.execute(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );
        return rows[0].count;
    }

    static async createBulk(userIds, message, type = 'in_app') {
        const values = userIds.map(id => `(${id}, '${message.replace(/'/g, "''")}', '${type}')`).join(', ');
        await db.execute(`INSERT INTO notifications (user_id, message, type) VALUES ${values}`);
    }
}

module.exports = Notification;