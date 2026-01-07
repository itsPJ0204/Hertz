import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
    const supabase = await createClient();

    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: songs } = await supabase.from('songs').select('*');
    const { data: history } = await supabase.from('listening_history').select('*, songs(title)');

    return NextResponse.json({
        profiles,
        songs,
        history
    });
}
