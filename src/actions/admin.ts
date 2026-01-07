"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const ADMIN_EMAIL = "piyushj0204@gmail.com";

async function checkAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== ADMIN_EMAIL) {
        throw new Error("Unauthorized Access");
    }
    return { supabase, user };
}

export async function getPendingReports() {
    const { supabase } = await checkAdmin();

    // Fetch reports with song details
    const { data: reports, error } = await supabase
        .from('reports')
        .select(`
            *,
            songs (
                id,
                title,
                artist,
                cover_url
            )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Fetch reports error:", error);
        return [];
    }

    return reports;
}

export async function dismissReport(reportId: string) {
    const { supabase } = await checkAdmin();

    await supabase
        .from('reports')
        // @ts-ignore
        .update({ status: 'dismissed' })
        .eq('id', reportId);

    revalidatePath('/admin');
}

export async function banSong(reportId: string, songId: string) {
    const { supabase } = await checkAdmin();

    // 1. Delete the song
    // This will now Cascade to history/likes thanks to the SQL fix.
    const { error } = await supabase.from('songs').delete().eq('id', songId);

    if (error) {
        console.error("Ban Error:", error);
        throw new Error(`Failed to delete song: ${error.message} (Try running SQL_FIX_DELETION_CASCADE.sql)`);
    }

    // 2. Mark report as resolved (banned)
    await supabase
        .from('reports')
        // @ts-ignore
        .update({ status: 'resolved_banned' })
        .eq('id', reportId);

    revalidatePath('/admin');
    revalidatePath('/'); // Refresh Home Page
}
