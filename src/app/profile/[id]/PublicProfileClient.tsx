"use client";

import { useState } from "react";
import { Send, Clock, MessageCircle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Props {
    targetId: string;
    currentUserId: string;
    initialStatus: 'none' | 'pending' | 'connected';
}

export function PublicProfileClient({ targetId, currentUserId, initialStatus }: Props) {
    const [status, setStatus] = useState(initialStatus);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const handleConnect = async () => {
        setLoading(true);
        try {
            const { error } = await (supabase
                .from('connections')
                .insert({
                    user_a: currentUserId,
                    user_b: targetId,
                    status: 'pending',
                    match_score: 100 // Manual connection
                } as any));

            if (error) throw error;
            setStatus('pending');
        } catch (e) {
            console.error("Connection failed", e);
            alert("Failed to send signal. Try again.");
        } finally {
            setLoading(false);
        }
    };

    if (status === 'connected') {
        return (
            <Link href={`/chat/${targetId}`} className="w-full bg-black text-white font-black p-3 md:py-4 hover:bg-clay-primary transition-all flex items-center justify-center gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none uppercase">
                <MessageCircle size={20} />
                <span>Chat Now</span>
            </Link>
        );
    }

    if (status === 'pending') {
        return (
            <button disabled className="w-full bg-gray-200 text-gray-500 font-black p-3 md:py-4 border-2 border-black cursor-not-allowed flex items-center justify-center gap-2 uppercase">
                <Clock size={20} />
                <span>Signal Sent</span>
            </button>
        );
    }

    return (
        <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full bg-clay-secondary text-black font-black p-3 md:py-4 hover:bg-clay-primary hover:text-white transition-all flex items-center justify-center gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none uppercase disabled:opacity-50"
        >
            <Send size={20} />
            <span>{loading ? "..." : "Send Signal"}</span>
        </button>
    );
}
