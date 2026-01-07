"use client";

import { User, MessageCircle, Send, Clock } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

interface ConnectionProps {
    id: string;
    name: string;
    avatar_url?: string; // Added prop
    matchScore: number;
    sharedInterests: string[];
    initialStatus?: 'none' | 'pending' | 'connected';
    currentUserId?: string;
}

export function ConnectionCard({ id, name, avatar_url, matchScore, sharedInterests, initialStatus = 'none', currentUserId }: ConnectionProps) {
    const [status, setStatus] = useState(initialStatus);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const handleConnect = async () => {
        if (!currentUserId) return;
        setLoading(true);
        try {
            const { error } = await (supabase
                .from('connections')
                .insert({
                    user_a: currentUserId,
                    user_b: id,
                    status: 'pending',
                    match_score: matchScore
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

    return (
        <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_#000000] flex flex-col items-center text-center">
            {/* Avatar with Image Support */}
            <div className="w-24 h-24 rounded-full border-4 border-black mb-4 flex items-center justify-center bg-gray-100 overflow-hidden relative">
                {avatar_url ? (
                    <img
                        src={avatar_url}
                        alt={name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                        }}
                    />
                ) : (
                    <User size={40} className="opacity-50" />
                )}
                {/* Fallback for error */}
                <User size={40} className="absolute opacity-50 fallback-icon hidden pointer-events-none" />
            </div>

            <h3 className="text-xl font-black uppercase italic">{name}</h3>
            <div className="text-clay-primary font-black text-3xl my-2 tracking-tighter">{matchScore}% MATCH</div>

            <div className="flex flex-wrap gap-2 justify-center mb-6">
                {sharedInterests.map(i => (
                    <span key={i} className="text-xs font-black border-2 border-black px-3 py-1 bg-white uppercase skew-x-[-10deg]">
                        {i}
                    </span>
                ))}
            </div>

            {status === 'connected' ? (
                <Link href={`/chat/${id}`} className="w-full bg-black text-white font-black py-4 hover:bg-clay-primary transition-all flex items-center justify-center gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none uppercase">
                    <MessageCircle size={20} />
                    Chat Now
                </Link>
            ) : status === 'pending' ? (
                <button disabled className="w-full bg-gray-200 text-gray-500 font-black py-4 border-2 border-black cursor-not-allowed flex items-center justify-center gap-2 uppercase">
                    <Clock size={20} />
                    Signal Sent
                </button>
            ) : (
                <button
                    onClick={handleConnect}
                    disabled={loading}
                    className="w-full bg-clay-secondary text-black font-black py-4 hover:bg-clay-primary hover:text-white transition-all flex items-center justify-center gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none uppercase disabled:opacity-50"
                >
                    <Send size={20} />
                    {loading ? "Sending..." : "Send Signal"}
                </button>
            )}
        </div>
    );
}
