
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleLike(songId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Check if liked
    const { data: existing } = await supabase
        .from('likes')
        .select('*')
        .eq('user_id', user.id)
        .eq('song_id', songId)
        .single();

    if (existing) {
        // Unlike
        await supabase
            .from('likes')
            .delete()
            .eq('user_id', user.id)
            .eq('song_id', songId);
    } else {
        // Like
        await supabase
            .from('likes')
            .insert({
                user_id: user.id,
                song_id: songId
            } as any);
    }

    revalidatePath('/');
    revalidatePath('/liked');
}
