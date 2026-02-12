import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ linked: false });
    }

    const { data: profile } = await supabase
        .from('user_music_profiles')
        .select('is_spotify_linked')
        .eq('user_id', user.id)
        .single();

    return NextResponse.json({ linked: !!profile?.is_spotify_linked });
}
