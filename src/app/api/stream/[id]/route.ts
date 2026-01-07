import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // Await params as it is a Promise in Next.js 15+
    const { id } = await params;

    const supabase = await createClient();

    // 1. Authenticate Request
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Look up Song Metadata (Path)
    console.log(`[Stream API] Fetching song metadata for ID: ${id}`);
    const { data: song, error } = await supabase
        .from('songs')
        .select('file_path')
        .eq('id', id)
        .single() as any;

    if (error || !song || !song.file_path) {
        console.error(`[Stream API] Song lookup failed for ${id}:`, error || "No file path");
        return new NextResponse("Song not found", { status: 404 });
    }
    console.log(`[Stream API] Found file path: ${song.file_path}`);

    // 3. Generate Signed URL (Short-lived 60s)
    // We do NOT redirect the user to this. We fetch it ourselves.
    // Or, for streaming performance, we can redirect if the token is one-time use, 
    // but the safest "Proxy" method helps hide the bucket structure completely.
    // However, piping a stream in Next.js Server Actions/Routes can be heavy.
    // A balanced approach: Generate a signed URL and Redirect. 
    // The bucket is private, so they CANNOT access it without the signature.
    // The signature expires in 60s, so they can't share it effectively.
    // "Proxying" the actual bytes is expensive for Vercel/Node. 
    // Secure Redirect is standard for Signed URLs.

    // BUT the user specifically asked for "Never be exposed directly to the client" and "Proxy Streaming".
    // "Do NOT expose: Static stream URLs". Signed URLs are dynamic.
    // Let's try to Proxy if possible, or Fallback to Signed Redirect if performance is key.
    // Given the strict requirement "Do NOT expose... Static stream URLs", a 60s signed URL IS NOT static.
    // But "Never be exposed directly to the client" suggests we should Proxy the bytes.

    const { data: signedData, error: signError } = await supabase
        .storage
        .from('private_songs')
        .createSignedUrl(song.file_path, 60); // 60 seconds validity

    if (signError || !signedData) {
        return new NextResponse("Error generating stream", { status: 500 });
    }

    // PROXY IMPLEMENTATION:
    // Fetch the signed URL content server-side
    // Forward Range header if present (Critical for audio playback/seeking)
    const range = request.headers.get("range");
    const fetchHeaders: HeadersInit = {};
    if (range) {
        fetchHeaders["Range"] = range;
        console.log(`[Stream API] Forwarding Range request: ${range}`);
    }

    const response = await fetch(signedData.signedUrl, {
        headers: fetchHeaders
    });

    if (!response.ok) {
        console.error(`[Stream API] Upstream fetch failed: ${response.status} ${response.statusText}`);
        return new NextResponse("Stream fetch failed", { status: response.status });
    }

    // Return the stream with correct headers (206 if range, 200 otherwise)
    return new NextResponse(response.body, {
        status: response.status,
        headers: {
            "Content-Type": response.headers.get("Content-Type") || "audio/mpeg",
            "Content-Length": response.headers.get("Content-Length") || "",
            "Content-Range": response.headers.get("Content-Range") || "",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Accept-Ranges": "bytes",
        },
    });
}
