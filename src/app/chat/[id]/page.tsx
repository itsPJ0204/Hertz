import { createClient } from "@/lib/supabase/server";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function ChatRoomPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: receiverId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // 1. Ensure a connection exists and is connected
    const { data: connectionData } = await supabase
        .from("connections")
        .select("id, status")
        .or(`and(user_a.eq.${user.id},user_b.eq.${receiverId}),and(user_a.eq.${receiverId},user_b.eq.${user.id})`)
        .single();

    const connection = connectionData as { id: string; status: string | null } | null;

    if (!connection || connection.status !== 'connected') {
        // Not allowed if not connected
        redirect("/feed");
    }

    // 2. Fetch receiver info
    const { data: receiverData } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", receiverId)
        .single();

    const receiver = receiverData as { full_name: string | null; avatar_url: string | null } | null;

    return (
        <div className="min-h-screen bg-clay-bg p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <Link href="/feed" className="inline-flex items-center gap-2 font-black mb-6 hover:underline uppercase italic">
                    <ArrowLeft /> Back to Matches
                </Link>

                <ChatWindow
                    connectionId={connection.id}
                    receiverId={receiverId}
                    receiverName={receiver?.full_name || "Anonymous"}
                    receiverAvatar={receiver?.avatar_url || undefined}
                />
            </div>
        </div>
    );
}
