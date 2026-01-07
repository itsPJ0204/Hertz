"use server";

import { createClient } from "@/lib/supabase/server";

export async function submitReport(songId: string, reason: string, description: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // @ts-ignore
    const { error } = await supabase.from('reports').insert({
        song_id: songId,
        reporter_id: user.id,
        reason,
        description,
        status: 'pending'
    });

    if (error) {
        console.error("Report submission failed:", error);
        throw new Error(`Failed to submit report: ${error.message} (${error.code})`);
    }

    return { success: true };
}
