const { supabase } = require('../config/supabase');

class Market {
    static async findAll() {
        const { data, error } = await supabase
            .from('markets')
            .select('*')
            .order('name');
        if (error) throw error;
        return data;
    }

    static async create(marketData) {
        const { data, error } = await supabase
            .from('markets')
            .insert([{
                name: marketData.name,
                location: marketData.location
            }])
            .select()
            .single();
        if (error) throw error;
        return data.id;
    }

    static async update(marketId, marketData) {
        const { data, error } = await supabase
            .from('markets')
            .update({
                name: marketData.name,
                location: marketData.location
            })
            .eq('id', marketId)
            .select();
        if (error) throw error;
        return data.length > 0;
    }

    static async delete(marketId) {
        const { error } = await supabase
            .from('markets')
            .delete()
            .eq('id', marketId);
        if (error) throw error;
        return true;
    }

    static async findById(marketId) {
        const { data, error } = await supabase
            .from('markets')
            .select('*')
            .eq('id', marketId)
            .single();
        if (error) throw error;
        return data;
    }
}

module.exports = Market;
