"use client";

import { createClient } from "@/lib/supabase/client";
import { Users, MessageCircle, UploadCloud, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function Navigation() {
    const supabase = createClient();
    const pathname = usePathname();
    const [userId, setUserId] = useState<string | null>(null);
    const [pendingRequests, setPendingRequests] = useState(0);

    useEffect(() => {
        checkUser();
    }, []);

    useEffect(() => {
        if (!userId) return;

        // Initial fetch
        fetchPending();

        // Subscribe to changes in connections
        const channel = supabase.channel('nav-notifications')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'connections',
                    filter: `user_b=eq.${userId}`
                },
                () => {
                    fetchPending();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    async function checkUser() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setUserId(user.id);
    }

    async function fetchPending() {
        if (!userId) return;
        const { count } = await supabase
            .from('connections')
            .select('*', { count: 'exact', head: true })
            .eq('user_b', userId)
            .eq('status', 'pending');

        setPendingRequests(count || 0);
    }

    const isActive = (path: string) => pathname === path;

    return (
        <nav className="flex gap-6 items-center">
            <Link
                href="/feed"
                className={`relative group flex items-center gap-2 font-bold transition-all hover:scale-110 ${isActive('/feed') ? 'text-clay-primary' : ''}`}
                title="Matches"
            >
                <div className="relative">
                    <Users size={28} strokeWidth={2.5} />
                    {pendingRequests > 0 && (
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                            {pendingRequests}
                        </div>
                    )}
                </div>
                <span className="hidden md:inline uppercase text-sm">Matches</span>
            </Link>

            <Link
                href="/chat"
                className={`flex items-center gap-2 font-bold transition-all hover:scale-110 ${isActive('/chat') ? 'text-clay-primary' : ''}`}
                title="Chats"
            >
                <MessageCircle size={28} strokeWidth={2.5} />
                <span className="hidden md:inline uppercase text-sm">Chats</span>
            </Link>

            <Link
                href="/upload"
                className={`flex items-center gap-2 font-bold transition-all hover:scale-110 opacity-50 hover:opacity-100 ${isActive('/upload') ? 'text-clay-primary opacity-100' : ''}`}
                title="Secure Studio"
            >
                <UploadCloud size={28} strokeWidth={2.5} />
                <span className="hidden md:inline uppercase text-sm">Secure Upload</span>
            </Link>

            <Link
                href="/profile"
                className={`flex items-center gap-2 font-bold transition-all hover:scale-110 bg-black text-white px-3 py-1 -skew-x-12 hover:skew-x-0 ${isActive('/profile') ? 'bg-clay-primary' : ''}`}
                title="Profile"
            >
                <User size={20} />
                <span className="uppercase text-sm">Profile</span>
            </Link>

            <Link
                href="/debug"
                className="flex items-center gap-2 font-black transition-all hover:scale-110 bg-red-600 text-white px-3 py-1 border-2 border-black"
                title="Debug Tools"
            >
                <span className="uppercase text-xs">DEBUG</span>
            </Link>
        </nav>
    );
}
