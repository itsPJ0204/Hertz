"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { JamendoTrack } from "@/lib/jamendo";

export async function getUserPlaylists() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not logged in" };

    const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        // If table doesn't exist, return empty for now
        if (error.code === '42P01') return { success: true, playlists: [] };
        console.error("Error fetching playlists:", error);
        return { success: false, error: error.message };
    }

    return { success: true, playlists: data || [] };
}

export async function createPlaylist(name: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not logged in" };

    const { data, error } = await supabase
        .from('playlists')
        .insert({ user_id: user.id, name })
        .select()
        .single();

    if (error) {
        console.error("Error creating playlist:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/", "layout");
    return { success: true, playlist: data };
}

export async function addSongToPlaylist(playlistId: string, track: JamendoTrack) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not logged in" };

    // 1. Ensure song exists in `songs` table (similar to history tracking logic)
    let songId = track.id;
    const isLocal = track.audio === 'local_upload' || (track.audio && track.audio.includes('/api/stream/'));

    if (!isLocal) {
        const { data: song, error: songError } = await (supabase
            .from('songs') as any)
            .upsert({
                external_id: track.id,
                title: track.name,
                artist: track.artist_name,
                url: track.audio,
                cover_url: track.image,
                genre: track.musicinfo?.tags?.genres?.[0] || 'Unknown',
                duration: track.duration,
                origin: 'jamendo'
            }, { onConflict: 'external_id' })
            .select()
            .single();

        if (songError) {
            console.error("Error upserting song:", songError);
            return { success: false, error: songError.message };
        }
        songId = song.id;
    }

    // 2. Insert into playlist_songs
    const { error: insertError } = await supabase
        .from('playlist_songs')
        .insert({
            playlist_id: playlistId,
            song_id: songId
        });

    if (insertError) {
        if (insertError.code === '23505') { // Unique violation
            return { success: false, error: "Song already in playlist" };
        }
        console.error("Error adding to playlist:", insertError);
        return { success: false, error: insertError.message };
    }

    // Optionally update playlist cover if it's empty
    const { data: playlist } = await supabase.from('playlists').select('cover_url').eq('id', playlistId).single();
    if (playlist && !playlist.cover_url && track.image) {
        await supabase.from('playlists').update({ cover_url: track.image }).eq('id', playlistId);
    }

    revalidatePath(`/my-playlists/${playlistId}`);
    return { success: true };
}
