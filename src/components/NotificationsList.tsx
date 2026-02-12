"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { markNotificationAsRead } from "@/actions/notifications";
import { Bell, Check, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function NotificationsList() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        fetchNotifications();

        // Subscribe to new notifications
        const channel = supabase
            .channel('notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
                () => {
                    fetchNotifications();
                    // Also trigger sidebar refresh
                    window.dispatchEvent(new Event("refresh-notifications"));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function fetchNotifications() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_read', false)
            .order('created_at', { ascending: false });

        setNotifications(data || []);
    }

    async function handleRead(id: string, link?: string) {
        await markNotificationAsRead(id);
        setNotifications(prev => prev.filter(n => n.id !== id));
        window.dispatchEvent(new Event("refresh-notifications")); // Update sidebar badge

        if (link) {
            router.push(link);
            setIsOpen(false);
        }
    }

    if (notifications.length === 0) return null;

    return (
        <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-2">
            {!isOpen ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-black text-white p-4 rounded-full border-2 border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] flex items-center gap-2 hover:scale-110 transition-transform"
                >
                    <Bell className="animate-bounce" />
                    <span className="font-black">{notifications.length} New Signal{notifications.length > 1 ? 's' : ''}</span>
                </button>
            ) : (
                <div className="bg-white border-4 border-black p-4 w-80 shadow-[8px_8px_0px_0px_#000] animate-in slide-in-from-bottom-5">
                    <div className="flex justify-between items-center mb-4 border-b-2 border-black pb-2">
                        <h3 className="font-black uppercase italic">Incoming Transmissions</h3>
                        <button onClick={() => setIsOpen(false)}><X size={20} /></button>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {notifications.map(n => (
                            <div key={n.id} className="bg-gray-100 p-3 border-2 border-black relative group hover:bg-clay-secondary/20 transition-colors">
                                <p className="text-sm font-bold mb-2">{n.content}</p>
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => handleRead(n.id)}
                                        className="text-xs uppercase font-black border border-black px-2 py-1 hover:bg-gray-200"
                                    >
                                        Dismiss
                                    </button>
                                    {n.link && (
                                        <button
                                            onClick={() => handleRead(n.id, n.link)}
                                            className="text-xs uppercase font-black bg-black text-white px-2 py-1 hover:bg-gray-800 flex items-center gap-1"
                                        >
                                            View <Check size={10} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
