"use client";

import { createClient } from "@/lib/supabase/client";
import { Send, MoreVertical, Phone, Video, User as UserIcon, ChevronLeft, Check, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { markMessagesAsRead } from "@/actions/notifications";
import { removeConnection } from "@/actions/connections";
import { ImageModal } from "@/components/ui/ImageModal";

interface ChatWindowProps {
    connectionId: string;
    receiverId: string;
    receiverName: string;
    receiverAvatar?: string;
}

function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}

export function ChatWindow({ connectionId, receiverId, receiverName, receiverAvatar }: ChatWindowProps) {
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isImageOpen, setIsImageOpen] = useState(false);
    const supabase = createClient();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial Fetch
    useEffect(() => {
        const setup = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);

            if (user) {
                // Fetch messages between user and receiver
                const { data } = await supabase
                    .from("messages")
                    .select("*")
                    // @ts-ignore
                    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
                    .order("created_at", { ascending: true });

                if (data) setMessages(data);
            }
        };
        setup();
    }, [receiverId]);

    // Mark as read on mount
    useEffect(() => {
        markMessagesAsRead(receiverId).then(() => {
            console.log("[ChatWindow] Messages marked read. Dispatching refresh-notifications.");
            window.dispatchEvent(new Event("refresh-notifications"));
        });
    }, [receiverId]);

    // Subscription
    useEffect(() => {
        if (!currentUser) return;

        const channel = supabase
            .channel(`chat:${receiverId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${currentUser.id}`
                },
                (payload) => {
                    const newMsg = payload.new;
                    // Check if this message belongs to this conversation
                    if (newMsg.sender_id === receiverId) {
                        setMessages((prev: any) => [...prev, newMsg]);
                        markMessagesAsRead(receiverId).then(() => {
                            window.dispatchEvent(new Event("refresh-notifications"));
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [receiverId, currentUser]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !currentUser) return;

        const optimisticMsg = {
            id: Date.now().toString(),
            content: newMessage,
            sender_id: currentUser.id,
            created_at: new Date().toISOString()
        };

        setMessages((prev: any) => [...prev, optimisticMsg]);
        setNewMessage("");

        const { error } = await supabase
            .from('messages')
            .insert({
                sender_id: currentUser.id,
                receiver_id: receiverId,
                content: optimisticMsg.content
            } as any);

        if (error) {
            console.error("Failed to send", error);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] bg-white border-2 border-black shadow-[8px_8px_0px_0px_black] relative z-10">
            {/* Header */}
            <div className="bg-black text-white p-4 flex justify-between items-center border-b-2 border-white/20 relative">
                <div className="flex items-center gap-4">
                    <Link href="/chat" className="hover:text-clay-primary transition-colors">
                        <ChevronLeft size={28} />
                    </Link>
                    <div
                        className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-gray-800 flex-shrink-0 cursor-pointer hover:border-clay-primary transition-colors"
                        onClick={() => setIsImageOpen(true)}
                    >
                        {receiverAvatar ? (
                            <img src={receiverAvatar} alt={receiverName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <User size={20} />
                            </div>
                        )}
                    </div>
                    <div>
                        <h2 className="font-black uppercase text-xl leading-none">{receiverName}</h2>
                    </div>
                </div>
                <div className="flex gap-4 relative">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="hover:text-clay-primary transition-colors"
                    >
                        <MoreVertical size={20} />
                    </button>
                    {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white border-2 border-black shadow-[4px_4px_0px_0px_black] z-50">
                            <button
                                onClick={async () => {
                                    if (confirm("Are you sure you want to remove this connection?")) {
                                        await removeConnection(connectionId);
                                    }
                                }}
                                className="w-full text-left px-4 py-3 text-red-600 font-bold hover:bg-gray-100 uppercase text-xs tracking-wider"
                            >
                                Remove Connection
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"
            >
                {messages.map((msg: any) => {
                    const isMe = msg.sender_id === currentUser?.id;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[70%] p-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] ${isMe
                                    ? 'bg-clay-primary text-white rounded-l-xl rounded-tr-xl'
                                    : 'bg-white text-black rounded-r-xl rounded-tl-xl'
                                    }`}
                            >
                                <p className="font-bold text-sm">{msg.content}</p>
                                <div className="flex items-center justify-end gap-1 mt-1">
                                    <p className={`text-[10px] font-mono opacity-70 ${isMe ? 'text-white/80' : 'text-gray-500'}`}>
                                        {formatTimeAgo(msg.created_at)}
                                    </p>
                                    {isMe && msg.is_read && (
                                        <Check size={12} className="text-orange-300" strokeWidth={4} />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t-2 border-black">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 border-2 border-black p-3 font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_black] transition-shadow placeholder:uppercase placeholder:text-xs"
                    />
                    <button
                        type="submit"
                        className="bg-black text-white p-3 border-2 border-black hover:bg-clay-primary hover:border-black hover:text-white transition-all shadow-[4px_4px_0px_0px_black] active:translate-y-1 active:shadow-none"
                    >
                        <Send size={24} />
                    </button>
                </div>
            </form>

            <ImageModal
                src={receiverAvatar || ""}
                alt={receiverName}
                isOpen={isImageOpen}
                onClose={() => setIsImageOpen(false)}
            />
        </div >
    );
}
