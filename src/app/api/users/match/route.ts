import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { findSpotifyMatches } from '@/lib/spotify-matching';

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const matches = await findSpotifyMatches(user.id);

        // Fetch User Details for the matches
        const userIds = matches.map(m => m.user_id);
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

        const enrichedMatches = matches.map(match => {
            const profile = profiles?.find(p => p.id === match.user_id);
            return {
                ...match,
                user: profile || { full_name: 'Unknown', avatar_url: '' }
            };
        });

        return NextResponse.json({ matches: enrichedMatches });
    } catch (error) {
        console.error('Matching error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
