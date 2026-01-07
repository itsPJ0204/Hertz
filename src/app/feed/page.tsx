import { ConnectionCard } from "@/components/feed/ConnectionCard";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTopMatches } from "@/lib/matching";
import { redirect } from "next/navigation";

import { IncomingRequest } from "@/components/chat/IncomingRequest";

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

            <h1 className="text-4xl font-bold mb-8 uppercase italic">Suggested Connections</h1>

            {matches.length === 0 ? (
                <div className="p-8 border-2 border-black bg-white text-center">
                    <h3 className="text-xl font-bold mb-2">No Matches Yet</h3>
                    <p>Listen to more music to build your vibe profile!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {matches.map(m => (
                        <ConnectionCard
                            key={m.id}
                            {...m}
                            currentUserId={user.id}
                            initialStatus={connectionMap.get(m.id) || 'none'}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
