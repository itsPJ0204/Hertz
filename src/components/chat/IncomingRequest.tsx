"use client";

import { Check, X, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createNotification } from "@/actions/notifications";

interface IncomingRequestProps {
    connectionId: string;
    sender: {
        id: string;
        full_name: string;
        avatar_url?: string;
    };
}

export function IncomingRequest({ connectionId, sender }: IncomingRequestProps) {
    const [status, setStatus] = useState<'pending' | 'accepted' | 'rejected'>('pending');
    const supabase = createClient();
    const router = useRouter();

    const handleAccept = async () => {
        const { error } = await supabase
            .from('connections')
            // @ts-ignore
            .update({ status: 'connected' })
            .eq('id', connectionId);

        if (!error) {
            setStatus('accepted');

            // Notify the SENDER that their request was accepted
            // "You accepted sender's request" -> Notify Sender
            await createNotification(
                sender.id,
                'match_accepted',
                `Your vibe check with ${sender.full_name} was successful! Start chatting now.`,
                `/chat` // Link to chat list, ideally to specific chat but we'd need to know current user id connection logic
            );

            router.refresh();
        }
    };

    const handleReject = async () => {
        const { error } = await supabase
            .from('connections')
            .delete()
            .eq('id', connectionId);

        if (!error) {
            setStatus('rejected');
            router.refresh();
        }
    };

    if (status === 'rejected') return null;

    if (status === 'accepted') {
        return (
            <div className="bg-green-100 border-2 border-green-500 p-4 mb-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="bg-green-500 text-white rounded-full p-1">
                    <Check size={16} />
                </div>
                <div>
                    <h3 className="font-bold uppercase">Frequency Matched!</h3>
                    <p className="text-sm">You can now vibe with {sender.full_name}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000] flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-black overflow-hidden bg-gray-100 flex items-center justify-center">
                    {sender.avatar_url ? (
                        <img src={sender.avatar_url} alt={sender.full_name} className="w-full h-full object-cover" />
                    ) : (
                        <User className="opacity-50" />
                    )}
                </div>
                <div>
                    <h3 className="font-black uppercase italic text-lg leading-none">{sender.full_name}</h3>
                    <p className="text-xs font-bold text-gray-500 uppercase">Wants to Vibe</p>
                </div>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={handleReject}
                    className="w-10 h-10 flex items-center justify-center border-2 border-black hover:bg-red-100 text-red-500 transition-colors"
                    title="Ignore"
                >
                    <X size={20} />
                </button>
                <button
                    onClick={handleAccept}
                    className="bg-black text-white px-4 h-10 font-bold border-2 border-black hover:bg-clay-primary hover:border-black hover:text-black transition-all flex items-center gap-2"
                >
                    <Check size={16} />
                    ACCEPT
                </button>
            </div>
        </div>
    );
}
