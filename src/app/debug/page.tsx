"use client";

import { useEffect, useState } from "react";
import { getLikedSongs } from "@/actions/getLikedSongs";
import { createClient } from "@/lib/supabase/client";

export default function DebugPage() {
    const [logs, setLogs] = useState<string[]>([]);
    const [songs, setSongs] = useState<any[]>([]);
    const supabase = createClient();

    const log = (msg: string) => setLogs(p => [...p, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    useEffect(() => {
        runDiagnostics();
    }, []);

    const runDiagnostics = async () => {
        log("Starting Diagnostics...");

        // 1. Check Auth
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            log("❌ User NOT Logged In");
            return;
        }
        log(`✅ User Logged In: ${user.email} (${user.id})`);

        // 2. Fetch Songs
        log("Fetching Liked Songs...");
        const liked = await getLikedSongs();
        log(`✅ Fetched ${liked?.length || 0} songs`);
        setSongs(liked || []);

        if (liked && liked.length > 0) {
            // 3. Test First Song Stream
            const song = liked[0];
            log(`Testing Song: ${song.title} (${song.id})`);
            log(`DB URL: ${song.url}`);

            if (song.url === 'local_upload' || !song.url.startsWith('http')) {
                // Test Stream API
                const streamUrl = `/api/stream/${song.id}`;
                log(`Testing Proxy Stream: ${streamUrl}`);
                try {
                    const res = await fetch(streamUrl, { method: 'HEAD' });
                    log(`Stream API Status: ${res.status} ${res.statusText}`);
                    if (res.ok) {
                        log("✅ Stream API Accessible");
                        log(`Content-Type: ${res.headers.get('content-type')}`);
                        log(`Content-Length: ${res.headers.get('content-length')}`);
                    } else {
                        log("❌ Stream API Error");
                    }
                } catch (e: any) {
                    log(`❌ Network Error: ${e.message}`);
                }
            } else {
                log("Direct HTTP URL - should work if internet is active.");
            }
        }
    };

    const testPermissions = async () => {
        log("Testing DB INSERT Permission...");
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            log("❌ No User");
            return;
        }

        const dummy = {
            title: "Permission Test",
            artist: "Test",
            genre: "Test",
            url: "local_upload",
            origin: "test",
            duration: 10,
            uploader_id: user.id,
            file_path: "test/perm_test.mp3",
            file_hash: `test_hash_${Date.now()}`,
            is_original: true
        };

        const { error } = await (supabase.from('songs') as any).insert(dummy).select();

        if (error) {
            log(`❌ INSERT FAILED: ${error.message}`);
            log(`Details: ${error.details || 'None'}`);
            log(`Hint: ${error.hint || 'None'}`);
            log(`Code: ${error.code}`);
        } else {
            log("✅ INSERT SUCCESS! (Cleaning up...)");
            // clean up
            await supabase.from('songs').delete().eq('file_hash', dummy.file_hash);
        }
    };

    const testMatching = async () => {
        log("--- TESTING MATCHING LOGIC ---");
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { log("❌ No User"); return; }
        log(`Current User: ${user.id}`);

        // 1. Check Profiles Visibility
        log("1. Fetching other profiles...");
        const { data: profiles, error: pError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .neq('id', user.id) // Get anyone else
            .limit(5);

        if (pError) {
            log(`❌ Profile Fetch Error: ${pError.message}`);
            return;
        }

        if (!profiles || profiles.length === 0) {
            log("❌ No other profiles found. Either you are the only user, or RLS is blocking 'SELECT' on profiles.");
            log("Try running SQL_FIX_MATCHING.sql again.");
            return;
        }

        const otherProfiles = profiles as any[];
        log(`✅ Found ${profiles.length} other user(s): ${otherProfiles.map(p => p.full_name).join(', ')}`);

        // 2. Check History Visibility
        const otherUser = otherProfiles[0];
        log(`2. Inspecting history for: ${otherUser.full_name} (${otherUser.id})...`);

        const { data: history, error: hError } = await supabase
            .from('listening_history')
            .select('songs(genre, artist)')
            .eq('user_id', otherUser.id); // Try to read THEIR history

        if (hError) {
            log(`❌ History Fetch Error: ${hError.message}`);
            return;
        }

        const count = history?.length || 0;
        log(`${count > 0 ? '✅' : '⚠️'} Found ${count} history items.`);

        if (count === 0) {
            log("   (If they have listened to songs, RLS is likely blocking 'SELECT' on listening_history)");
        } else {
            // 3. Algorithm Check
            log("3. Sample Data & Score Check:");
            const theirGenres = new Set(history.map((h: any) => h.songs?.genre).filter(Boolean));
            log(`   Their Genres: ${Array.from(theirGenres).join(', ')}`);

            // Check Own History
            const { data: myHistory } = await supabase
                .from('listening_history')
                .select('songs(genre, artist)')
                .eq('user_id', user.id);

            const myGenres = new Set(myHistory?.map((h: any) => h.songs?.genre).filter(Boolean));
            log(`   My Genres: ${Array.from(myGenres).join(', ')}`);

            // Calc Overlap
            const intersection = new Set([...myGenres].filter(x => theirGenres.has(x)));
            log(`   Overlap: ${intersection.size} (${Array.from(intersection).join(', ')})`);

            if (intersection.size > 0) {
                log("✅ MATCH SHOULD WORK! If the UI is empty, check the component code.");
            } else {
                log("⚠️ No genre overlap found. This explains why Score is 0.");
            }
        }
    };

    return (
        <div className="p-8 bg-black min-h-screen text-green-400 font-mono">
            <h1 className="text-2xl font-bold mb-4">Hertz Diagnostics</h1>

            <div className="flex gap-4 mb-4">
                <button onClick={() => setLogs([])} className="bg-gray-800 px-4 py-2 border border-green-600 hover:bg-green-900">Clear Logs</button>
                <button onClick={runDiagnostics} className="bg-gray-800 px-4 py-2 border border-green-600 hover:bg-green-900">Run Diagnostics</button>
                <button onClick={testPermissions} className="bg-gray-800 px-4 py-2 border border-green-600 hover:bg-green-900 font-bold">Test DB Permissions</button>
                <button onClick={testMatching} className="bg-gray-800 px-4 py-2 border border-green-600 hover:bg-green-900 font-bold text-yellow-400">Test Matching</button>
            </div>

            <div className="border border-green-800 p-4 bg-gray-900 overflow-auto h-96 mb-8">
                {logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>

            <h2 className="text-xl font-bold mb-2">DB Dump (First 3)</h2>
            <pre className="text-xs text-white bg-gray-800 p-4 overflow-auto">
                {JSON.stringify(songs.slice(0, 3), null, 2)}
            </pre>
        </div>
    );
}
