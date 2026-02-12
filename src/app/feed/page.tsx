import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTopMatches } from "@/lib/matching";
import { redirect } from "next/navigation";

import { IncomingRequest } from "@/components/chat/IncomingRequest";
import { FeedClient } from "../../components/feed/FeedClient";

export default async function FeedPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Parallel Fetching
    const [matches, requestsResult, connectionsResult] = await Promise.all([
        getTopMatches(user.id),
        // Fetch Incoming Requests (pending)
        supabase
            .from("connections")
            .select(`
                id,
                user_a,
                profiles!user_a(id, full_name, avatar_url)
            `)
            .eq("user_b", user.id)
            .eq("status", "pending"),
        // Fetch existing connections to determine status
        supabase
            .from('connections')
            .select('user_a, user_b, status')
            .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    ]);

    const requests = requestsResult.data;
    const connections = connectionsResult.data;

    const connectionMap = new Map<string, 'pending' | 'connected' | 'none'>();

    if (connections) {
        connections.forEach((c: any) => {
            const otherId = c.user_a === user.id ? c.user_b : c.user_a;
            connectionMap.set(otherId, c.status);
        });
    }

    // Filter out users who are already connected or pending
    const filteredMatches = matches.filter(m => {
        const status = connectionMap.get(m.id);
        return status !== 'connected' && status !== 'pending';
    });

    return (
        <div className="min-h-screen p-8 pb-32">
            <Link href="/" className="inline-flex items-center gap-2 font-bold mb-8 hover:underline">
                <ArrowLeft /> Back to Player
            </Link>

            {/* INCOMING REQUESTS SECTION */}
            {requests && requests.length > 0 && (
                <div className="mb-12">
                    <h2 className="text-4xl font-black uppercase mb-8 border-b-4 border-black pb-4 italic text-clay-secondary">Incoming Signals</h2>
                    <div className="grid gap-4 max-w-2xl">
                        {requests.map((r: any) => (
                            <IncomingRequest
                                key={r.id}
                                connectionId={r.id}
                                sender={(r as any).profiles}
                            />
                        ))}
                    </div>
                </div>
            )}

            <FeedClient matches={filteredMatches} />
        </div>
    );
}
