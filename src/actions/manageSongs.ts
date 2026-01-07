"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getMyUploads() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('uploader_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching my uploads:", error);
        return [];
    }

    return data;
}

export async function deleteSong(songId: string, filePath?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // Verify ownership
    const { data: song } = await supabase
        .from('songs')
        .select('*')
        .eq('id', songId)
        .eq('uploader_id', user.id)
        .single();

    if (!song) throw new Error("Song not found or unauthorized");

    // 1. Delete from Storage (if applicable)
    // Using file_path from DB if available, else passed argument
    // @ts-ignore
    const storagePath = song.file_path || filePath;
    if (storagePath) {
        const { error: storageError } = await supabase.storage
            .from('private_songs')
            .remove([storagePath]);

        if (storageError) console.error("Error deleting audio file:", storageError);
    }

    // Delete cover if it's a custom upload (logic depends on how we store covers, 
    // but usually cover paths should be stored securely too if they are user specific)
    // For now skipping cover delete to avoid accidenal deletion of shared resources if any.

    // 2. Delete from DB
    const { error } = await supabase
        .from('songs')
        .delete()
        .eq('id', songId);

    if (error) throw new Error("Failed to delete song record");

    revalidatePath('/profile');
    revalidatePath('/');
}

export async function updateSong(songId: string, updates: { title?: string, artist?: string, cover_url?: string }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // @ts-ignore
    const { error } = await supabase
        .from('songs')
        // @ts-ignore
        .update(updates)
        .eq('id', songId)
        .eq('uploader_id', user.id);

    if (error) throw new Error("Failed to update song");

    revalidatePath('/profile');
}
