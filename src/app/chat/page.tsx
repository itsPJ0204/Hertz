import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageCircle, User } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";

export default async function ChatsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Fetch Active Chats (connected)
    const { data: connections } = await supabase
        .from("connections")
        .select(`
            id,
            user_a,
            user_b,
            profiles_a:profiles!user_a(id, full_name, avatar_url),
            profiles_b:profiles!user_b(id, full_name, avatar_url)
        `)
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .eq("status", "connected");

    // Fetch unread messages count for current user
    const { data: unreadMessages } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('receiver_id', user.id)
        .eq('is_read', false);

    // Group counts by sender
    const unreadMap = (unreadMessages || []).reduce((acc: any, msg: any) => {
        acc[msg.sender_id] = (acc[msg.sender_id] || 0) + 1;
        return acc;
    }, {});

    const chats = connections?.map(c => {
        const otherProfile = ((c as any).user_a === user.id ? (c as any).profiles_b : (c as any).profiles_a);
        return {
            id: otherProfile.id,
            name: otherProfile.full_name,
            avatar: otherProfile.avatar_url,
            unread: unreadMap[otherProfile.id] || 0
        };
    }) || [];

    return (
        <div className="min-h-screen bg-clay-bg p-8">
            <div className="max-w-4xl mx-auto">
                <Link href="/feed" className="inline-flex items-center gap-2 font-black mb-8 hover:underline uppercase italic">
                    <ArrowLeft /> Back to Matches
                </Link>

                <h1 className="text-4xl font-black uppercase mb-8 border-b-4 border-black pb-4 italic">Conversations</h1>

                {chats.length === 0 ? (
                    <div className="p-12 border-4 border-black bg-white text-center shadow-[8px_8px_0px_0px_black]">
                        <MessageCircle size={48} className="mx-auto mb-4 opacity-20" />
                        <h3 className="text-2xl font-black uppercase mb-2">Silence is golden?</h3>
                        <p className="font-bold opacity-60 uppercase text-sm">Start a conversation from your match list!</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {chats.map(chat => (
                            <Link
                                key={chat.id}
                                href={`/chat/${chat.id}`}
                                className="bg-white border-2 border-black p-4 flex items-center gap-4 hover:translate-x-2 transition-transform shadow-[4px_4px_0px_0px_black] relative"
                            >
                                <div className="relative">
                                    <UserAvatar src={chat.avatar} alt={chat.name} />
                                    {chat.unread > 0 && (
                                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white">
                                            {chat.unread}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-black uppercase text-lg">{chat.name}</h3>
                                        {chat.unread > 0 && (
                                            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                                                {chat.unread} New
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs font-bold opacity-50 uppercase">Tap to open chat</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
