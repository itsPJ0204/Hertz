"use client";

import { User, MessageCircle, Send, Clock } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { ImageModal } from "@/components/ui/ImageModal";

interface ConnectionProps {
    id: string;
    name: string;
    avatar_url?: string; // Added prop
    matchScore: number;
    sharedInterests: string[];
    initialStatus?: 'none' | 'pending' | 'connected';
    currentUserId?: string;
    recommendationSource?: 'Hz' | 'Spotify' | 'Both';
}

export function ConnectionCard({ id, name, avatar_url, matchScore, sharedInterests, initialStatus = 'none', currentUserId, recommendationSource = 'Hz' }: ConnectionProps) {
    const [status, setStatus] = useState(initialStatus);
    const [loading, setLoading] = useState(false);
    const [isImageOpen, setIsImageOpen] = useState(false);
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
        <div className="bg-white border-2 border-black p-4 md:p-6 shadow-[4px_4px_0px_0px_#000000] flex flex-row md:flex-col items-center md:text-center relative gap-4 md:gap-0">
            
            {/* Desktop Badge (Top Right) */}
            <div className="hidden md:block absolute top-3 right-3">
                <span className={`text-[10px] font-black border-2 border-black px-2 py-0.5 uppercase ${
                    recommendationSource === 'Spotify' ? 'bg-[#1DB954] text-white' : 
                    recommendationSource === 'Both' ? 'bg-purple-500 text-white' : 
                    'bg-clay-primary text-white'
                }`}>
                    {recommendationSource}
                </span>
            </div>

            {/* Avatar with Image Support */}
            <div
                className="w-16 h-16 min-w-[4rem] md:w-24 md:h-24 md:min-w-[6rem] rounded-full border-2 md:border-4 border-black md:mb-4 flex items-center justify-center bg-gray-100 overflow-hidden relative cursor-pointer hover:border-clay-primary transition-colors flex-shrink-0"
                onClick={() => setIsImageOpen(true)}
            >
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
                    <User className="opacity-50 w-8 h-8 md:w-10 md:h-10" />
                )}
                {/* Fallback for error */}
                <User className="absolute opacity-50 fallback-icon hidden pointer-events-none w-8 h-8 md:w-10 md:h-10" />
            </div>

            <ImageModal
                src={avatar_url || ""}
                alt={name}
                isOpen={isImageOpen}
                onClose={() => setIsImageOpen(false)}
            />

            {/* Middle Section (Mobile) / Center Section (Desktop) */}
            <div className="flex-1 flex flex-col md:items-center w-full">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg md:text-xl font-black uppercase italic truncate">{name}</h3>
                    {/* Mobile Badge */}
                    <span className={`md:hidden text-[9px] font-black border-2 border-black px-1.5 py-0.5 uppercase ${
                        recommendationSource === 'Spotify' ? 'bg-[#1DB954] text-white' : 
                        recommendationSource === 'Both' ? 'bg-purple-500 text-white' : 
                        'bg-clay-primary text-white'
                    }`}>
                        {recommendationSource}
                    </span>
                </div>
                
                <div className="text-clay-primary font-black text-xl md:text-3xl my-1 md:my-2 tracking-tighter">
                    {matchScore}% <span className="md:hidden text-xs text-black">MATCH</span>
                </div>

                <div className="hidden md:flex flex-wrap gap-2 justify-center mb-6">
                    {sharedInterests.map(i => (
                        <span key={i} className="text-xs font-black border-2 border-black px-3 py-1 bg-white uppercase skew-x-[-10deg]">
                            {i}
                        </span>
                    ))}
                </div>
            </div>

            {/* Actions (Right Mobile / Bottom Desktop) */}
            <div className="flex-shrink-0 md:w-full">
                {status === 'connected' ? (
                    <Link href={`/chat/${id}`} className="md:w-full bg-black text-white font-black p-3 md:py-4 hover:bg-clay-primary transition-all flex items-center justify-center gap-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none uppercase rounded-full md:rounded-none">
                        <MessageCircle size={20} />
                        <span className="hidden md:inline">Chat Now</span>
                    </Link>
                ) : status === 'pending' ? (
                    <button disabled className="md:w-full bg-gray-200 text-gray-500 font-black p-3 md:py-4 border-2 border-black cursor-not-allowed flex items-center justify-center gap-2 uppercase rounded-full md:rounded-none">
                        <Clock size={20} />
                        <span className="hidden md:inline">Sent</span>
                    </button>
                ) : (
                    <button
                        onClick={handleConnect}
                        disabled={loading}
                        className="md:w-full bg-clay-secondary text-black font-black p-3 md:py-4 hover:bg-clay-primary hover:text-white transition-all flex items-center justify-center gap-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none uppercase disabled:opacity-50 rounded-full md:rounded-none"
                    >
                        <Send size={20} />
                        <span className="hidden md:inline">{loading ? "..." : "Send Signal"}</span>
                    </button>
                )}
            </div>
        </div>
    );
}
