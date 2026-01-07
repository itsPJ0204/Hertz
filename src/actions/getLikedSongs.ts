"use server";

import { createClient } from "@/lib/supabase/server";

export async function getLikedSongs() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from('likes')
        .select(`
            song_id,
            songs (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching liked songs:", error);
        return [];
    }

    // Map to flatten structure
    return data.map((item: any) => item.songs);
}
