import { createClient } from './supabase/server';

interface UserPreferences {
    genres: Set<string>;
    artists: Set<string>;
}

export async function getVibeMatchScore(userIdA: string, userIdB: string): Promise<number> {
    const supabase = await createClient();

    // Fetch history for both
    const [historyA, historyB] = await Promise.all([
        supabase.from('listening_history').select('songs(genre, artist)').eq('user_id', userIdA),
        supabase.from('listening_history').select('songs(genre, artist)').eq('user_id', userIdB)
    ]);

    if (historyA.error || historyB.error) {
        console.error('Error fetching history for matching:', historyA.error || historyB.error);
        return 0;
    }

    console.log(`[Matching] User A (${userIdA}) history count: ${historyA.data?.length || 0}`);
    console.log(`[Matching] User B (${userIdB}) history count: ${historyB.data?.length || 0}`);

    const prefsA = extractPreferences(historyA.data);
    const prefsB = extractPreferences(historyB.data);

    // Genre Weight: 70%, Artist Weight: 30%
    const genreScore = calculateJaccardIndex(prefsA.genres, prefsB.genres);
    const artistScore = calculateJaccardIndex(prefsA.artists, prefsB.artists);

    console.log(`[Matching] Scores - Genre: ${genreScore}, Artist: ${artistScore}`);

    const totalScore = (genreScore * 0.7) + (artistScore * 0.3);

    return parseFloat(totalScore.toFixed(2));
}

function extractPreferences(data: any[]): UserPreferences {
    const genres = new Set<string>();
    const artists = new Set<string>();

    data.forEach((item: any) => {
        if (item.songs?.genre) genres.add(item.songs.genre.toLowerCase());
        if (item.songs?.artist) artists.add(item.songs.artist.toLowerCase());
    });

    return { genres, artists };
}

function calculateJaccardIndex(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 || setB.size === 0) return 0;

    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);

    return intersection.size / union.size;
}

export interface MatchedUser {
    id: string;
    name: string;
    avatar_url: string;
    matchScore: number;
    sharedInterests: string[];
}

export async function getTopMatches(currentUserId: string): Promise<MatchedUser[]> {
    const supabase = await createClient();

    // 1. Get all other users
    const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUserId)
        .limit(20);

    const users = usersData as any[] | null;

    if (!users) return [];

    const matches: MatchedUser[] = [];

    // 2. Calculate match score for each
    for (const user of users) {
        const score = await getVibeMatchScore(currentUserId, user.id);
        console.log(`[Matching] Comparing with ${user.full_name}: Score = ${score}`);

        // Only include if > 10% match for testing (70% in prod)
        if (score > 0.1) {
            matches.push({
                id: user.id,
                name: user.full_name || 'Anonymous',
                avatar_url: user.avatar_url || '',
                matchScore: Math.round(score * 100),
                sharedInterests: ['Shared Vibe'] // Logic to compute intersection can be added here
            });
        }
    }

    console.log(`[Matching] Found ${matches.length} matches for User ${currentUserId}`);
    return matches.sort((a, b) => b.matchScore - a.matchScore);
}
