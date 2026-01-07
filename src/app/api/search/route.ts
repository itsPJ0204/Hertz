
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 1) {
        return NextResponse.json({ results: [] });
    }

    const supabase = await createClient();

    // Search logic:
    // We want to find songs where title OR artist OR genre matches the query.
    // Supabase .or() syntax is flexible.

    const { data: songs, error } = await supabase
        .from("songs")
        .select("*")
        .or(`title.ilike.%${query}%,artist.ilike.%${query}%,genre.ilike.%${query}%`)
        .limit(10); // Limit results for performance

    if (error) {
        console.error("Search API Error:", error);
        return NextResponse.json({ results: [], error: error.message }, { status: 500 });
    }

    // Normalize results (e.g. valid image url)
    const results = (songs || []).map((song: any) => ({
        id: song.id,
        name: song.title,
        artist: song.artist,
        genre: song.genre,
        image: song.cover_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&background=random`,
        audio: song.url,
    }));

    return NextResponse.json({ results });
}
