import { createClient } from "@supabase/supabase-js";

// Ezeket töltsd be az .env fájlodból
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Hozzuk létre a kliens objektumot
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default supabaseClient;
