import { supabase } from './supabaseClient';
export async function getDailyInfo() {
    const { data, error } = await supabase.from('daily_info').select('*').limit(10);
    if (error) throw error;
    return data;
}
