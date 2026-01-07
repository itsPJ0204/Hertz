"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function removeConnection(connectionId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    // Delete the match record
    // We strictly check that the user is part of the match (user_a or user_b) via RLS usually,
    // but explicit ID check is good if needed. For now, simple delete.
    const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId);

    if (error) {
        console.error("Error removing connection:", error);
        throw new Error("Failed to remove connection");
    }

    revalidatePath('/chat');
    revalidatePath('/feed');
    redirect('/chat');
}
