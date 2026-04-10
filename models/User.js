const { supabase } = require('../config/supabase');

class User {
    static async findByPhone(phone) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('phone', phone)
            .single();
        if (error) throw error;
        return data;
    }

    static async create(userData) {
        const { data, error } = await supabase
            .from('users')
            .insert([{
                name: userData.name,
                phone: userData.phone,
                email: userData.email,
                role: userData.role,
                location: userData.location
            }])
            .select()
            .single();
        if (error) throw error;
        return data.id;
    }

    static async findAll() {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, phone, email, role, location, created_at')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    static async findById(id) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    }

    static async findAllByRole(role) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('role', role);
        if (error) throw error;
        return data;
    }

    static async update(id, userData) {
        const { data, error } = await supabase
            .from('users')
            .update({
                name: userData.name,
                phone: userData.phone,
                email: userData.email,
                role: userData.role,
                location: userData.location
            })
            .eq('id', id)
            .select();
        if (error) throw error;
        return data.length > 0;
    }

    static async delete(id) {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
}

module.exports = User;