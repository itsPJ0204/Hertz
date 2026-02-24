
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    const supabase = await createClient();

    let queryBuilder = supabase.from("songs").select("*");

    if (query && query.length > 0) {
        queryBuilder = queryBuilder.or(`title.ilike.%${query}%,artist.ilike.%${query}%,genre.ilike.%${query}%`);
    }

    const { data: songs, error } = await queryBuilder.limit(50); // Increased limit slightly to show more options

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
