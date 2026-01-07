"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface UnreadCounts {
    messages: number;
    matches: number;
    notifications: number;
}

import { unstable_noStore as noStore } from "next/cache";

export async function getUnreadCounts(): Promise<UnreadCounts> {
    noStore();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { messages: 0, matches: 0, notifications: 0 };

    // 1. Unread Messages
    // Count messages where receiver_id is user and is_read is false
    const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);

    // 2. Pending Matches (Inbound)
    // Count matches where user is user2 (receiver) and status is pending
    // 2. Pending Matches (Inbound)
    // Count matches where user is user_b (receiver) and status is pending
    const { count: matchCount } = await supabase
        .from('connections')
        .select('*', { count: 'exact', head: true })
        .eq('user_b', user.id)
        .eq('status', 'pending');

    // 3. System Notifications
    const { count: notifCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

    console.log(`[Server] Unread Counts for ${user.id}: Msg=${messageCount}, Match=${matchCount}, Notif=${notifCount}`);

    return {
        messages: messageCount || 0,
        matches: matchCount || 0,
        notifications: notifCount || 0
    };
}



export async function markMessagesAsRead(senderId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // @ts-ignore
    // @ts-ignore
    await supabase
        .from('messages')
        // @ts-ignore
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', senderId)
        .eq('is_read', false);

    revalidatePath('/chat');
    revalidatePath('/'); // Update sidebar
}

export async function markNotificationAsRead(notificationId: string) {
    const supabase = await createClient();
    // @ts-ignore
    await supabase
        .from('notifications')
        // @ts-ignore
        .update({ is_read: true })
        .eq('id', notificationId);

    revalidatePath('/');
}

export async function createNotification(recipientId: string, type: string, content: string, link: string) {
    const supabase = await createClient();
    await supabase.from('notifications').insert({
        user_id: recipientId,
        type,
        content,
        link,
        is_read: false
    } as any);
}
