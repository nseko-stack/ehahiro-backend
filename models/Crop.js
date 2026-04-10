const { supabase } = require('../config/supabase');

class Crop {
    static async findAll() {
        const { data, error } = await supabase
            .from('crops')
            .select('*')
            .order('name');
        if (error) throw error;
        return data;
    }

    static async create(cropData) {
        const { data, error } = await supabase
            .from('crops')
            .insert([{ name: cropData.name }])
            .select()
            .single();
        if (error) throw error;
        return data.id;
    }

    static async update(cropId, cropData) {
        const { data, error } = await supabase
            .from('crops')
            .update({ name: cropData.name })
            .eq('id', cropId)
            .select();
        if (error) throw error;
        return data.length > 0;
    }

    static async delete(cropId) {
        const { error } = await supabase
            .from('crops')
            .delete()
            .eq('id', cropId);
        if (error) throw error;
        return true;
    }

    static async findById(cropId) {
        const { data, error } = await supabase
            .from('crops')
            .select('*')
            .eq('id', cropId)
            .single();
        if (error) throw error;
        return data;
    }
}

module.exports = Crop;
