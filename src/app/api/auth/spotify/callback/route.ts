import { NextResponse } from 'next/server';
import SpotifyWebApi from 'spotify-web-api-node';
import { createClient } from '@/lib/supabase/server';
import { processSpotifyData } from '@/lib/spotify';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
        return NextResponse.redirect(new URL('/profile?error=spotify_auth_failed', request.url));
    }

    if (!code) {
        return NextResponse.redirect(new URL('/profile?error=no_code', request.url));
    }

    const { origin } = new URL(request.url);
    const redirectUri = `${origin}/api/auth/spotify/callback`;

    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
        return NextResponse.redirect(new URL('/profile?error=spotify_callback_failed&details=MISSING_ENV_REC_VARS', request.url));
    }

    const spotifyApi = new SpotifyWebApi({
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        redirectUri: redirectUri,
    });

    try {
        const data = await spotifyApi.authorizationCodeGrant(code);
        const { access_token, refresh_token } = data.body;

        // Set the access token on the API object to use it in subsequent calls
        spotifyApi.setAccessToken(access_token);
        spotifyApi.setRefreshToken(refresh_token);

        // Verify Identity First using raw fetch to bypass superagent bugs
        let debugUserEmail = 'unknown';
        let debugErrors: string[] = [];
        try {
            const res = await fetch('https://api.spotify.com/v1/me', {
                headers: { 'Authorization': `Bearer ${access_token}` }
            });
            const text = await res.text();
            if (!res.ok) {
                debugErrors.push(`MeRawErr:${res.status}-${text}`);
            } else {
                const me = JSON.parse(text);
                debugUserEmail = me.email;
                debugErrors.push(`Me:${me.product}`);
            }
        } catch (e: any) {
            debugErrors.push(`MeFetchCrash:${e.message}`);
        }

        // Fetch User Data with Granular Logging
        let processedProfile = {
            top_artists: [] as any[],
            top_genres: [] as any[],
            genre_vector: {} as Record<string, number>
        };

        let topArtistsItems: any[] = [];
        let topTracksItems: any[] = [];

        // 1. Fetch all data sources in parallel
        console.log('[Spotify] Starting parallel data fetch...');
        const timeRanges: ('short_term' | 'medium_term' | 'long_term')[] = ['short_term', 'medium_term', 'long_term'];
        
        const fetchPromises = [
            ...timeRanges.map(range => spotifyApi.getMyTopArtists({ limit: 50, time_range: range }).then(res => ({ type: 'top_artists', range, items: res.body.items }))),
            ...timeRanges.map(range => spotifyApi.getMyTopTracks({ limit: 50, time_range: range }).then(res => ({ type: 'top_tracks', range, items: res.body.items }))),
            spotifyApi.getMyRecentlyPlayedTracks({ limit: 50 }).then(res => ({ type: 'recent_tracks', items: res.body.items.map(i => i.track) })),
            spotifyApi.getMySavedTracks({ limit: 50 }).then(res => ({ type: 'saved_tracks', items: res.body.items.map(i => i.track) })),
            spotifyApi.getFollowedArtists({ limit: 50 }).then(res => ({ type: 'followed_artists', items: res.body.artists.items }))
        ];

        const results = await Promise.allSettled(fetchPromises);

        const allArtistsMap = new Map();
        const allTracksMap = new Map();
        let recentlyPlayedItems: any[] = [];
        let savedTracksItems: any[] = [];
        let followedArtistsItems: any[] = [];

        results.forEach((result) => {
            if (result.status === 'fulfilled') {
                const data = result.value;
                if (!data.items) return;

                if (data.type === 'top_artists') {
                    data.items.forEach((a: any) => allArtistsMap.set(a.id, a));
                } else if (data.type === 'top_tracks') {
                    data.items.forEach((t: any) => allTracksMap.set(t.id, t));
                } else if (data.type === 'recent_tracks') {
                    recentlyPlayedItems = data.items;
                    data.items.forEach((t: any) => allTracksMap.set(t.id, t));
                } else if (data.type === 'saved_tracks') {
                    savedTracksItems = data.items;
                    data.items.forEach((t: any) => allTracksMap.set(t.id, t));
                } else if (data.type === 'followed_artists') {
                    followedArtistsItems = data.items;
                    data.items.forEach((a: any) => allArtistsMap.set(a.id, a));
                }
            } else {
                console.error('[Spotify] Parallel fetch failed for a source:', result.reason);
                debugErrors.push(`FetchErr:${result.reason?.statusCode || 'unknown'}`);
            }
        });

        topArtistsItems = Array.from(allArtistsMap.values());
        topTracksItems = Array.from(allTracksMap.values());

        console.log(`[Spotify] Success: Fetched ${topArtistsItems.length} total unique artists and ${topTracksItems.length} total unique tracks`);

        // 3. Extract all unique Artist IDs to fetch FULL unstripped artist objects
        // Spotify recently started stripping 'genres' from the getMyTopArtists endpoint.
        // We MUST use getArtists(ids) to guarantee we get the genres back!
        const allArtistIds = new Set<string>();
        topArtistsItems.forEach(a => { if (a?.id) allArtistIds.add(a.id); });
        topTracksItems.forEach(t => t?.artists?.forEach((a: any) => { if (a?.id) allArtistIds.add(a.id); }));

        const artistIdArray = Array.from(allArtistIds).filter(id => id && typeof id === 'string').slice(0, 50); // Spotify limit is 50
        let finalArtists: any[] = [];

        if (artistIdArray.length > 0) {
            console.log(`[Spotify] Fetching unstripped data for ${artistIdArray.length} unique artists...`);
            try {
                const res = await fetch(`https://api.spotify.com/v1/artists?ids=${artistIdArray.join(',')}`, {
                    headers: { 'Authorization': `Bearer ${access_token}` }
                });
                const text = await res.text();
                if (!res.ok) {
                    console.log(`[Spotify] User-level getArtists failed (${res.status}). Attempting App-level fallback...`);
                    const ccData = await spotifyApi.clientCredentialsGrant();
                    const ccToken = ccData.body.access_token;
                    
                    const ccRes = await fetch(`https://api.spotify.com/v1/artists?ids=${artistIdArray.join(',')}`, {
                        headers: { 'Authorization': `Bearer ${ccToken}` }
                    });
                    const ccText = await ccRes.text();
                    
                    if (!ccRes.ok) {
                        debugErrors.push(`GetArtistsAppErr:${ccRes.status}-${ccText}`);
                        finalArtists = topArtistsItems;
                    } else {
                        const data = JSON.parse(ccText);
                        finalArtists = data.artists;
                        console.log(`[Spotify] Success: Fetched unstripped artists via App token`);
                    }
                } else {
                    const data = JSON.parse(text);
                    finalArtists = data.artists;
                    console.log(`[Spotify] Success: Fetched unstripped artists via User token`);
                }
            } catch (e: any) {
                console.error('[Spotify] Failed to fetch unstripped artists:', e);
                debugErrors.push(`GetArtistsFetchCrash:${e.message}`);
                finalArtists = topArtistsItems;
            }
        }

        processedProfile = processSpotifyData(finalArtists, topTracksItems);
        if (finalArtists.length > 0) {
            debugErrors.push(`FirstArtistGenres:${JSON.stringify(finalArtists[0]?.genres || 'none')}`);
        }

        // Removed Step 5 Hard Fallback since it's now handled in the parallel fetch

        // Store in Supabase
        const supabase = await createClient();
        let user;
        try {
            const { data } = await supabase.auth.getUser();
            user = data.user;
        } catch (authError: any) {
            // ... (auth error handling remains the same)
            const isRefreshError = authError?.code === 'refresh_token_not_found' ||
                authError?.message?.includes('refresh_token_not_found') ||
                JSON.stringify(authError).includes('refresh_token_not_found');

            if (isRefreshError) {
                await supabase.auth.signOut();
            }
            return NextResponse.redirect(new URL('/login?error=session_expired', request.url));
        }

        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        // Validate Data Presence
        const artistCount = processedProfile.top_artists.length;
        const genreCount = processedProfile.top_genres.length;
        const vectorSize = Object.keys(processedProfile.genre_vector).length;

        console.log('processedProfile Stats:', { artistCount, genreCount, vectorSize });

        const hasValidMusicData = artistCount > 0 || vectorSize > 0;

        if (!hasValidMusicData) {
            console.error('Spotify Linked but no music data found (Top or Library). Blocking link.');
            const errorTrace = debugErrors.length > 0 ? `_E_${encodeURIComponent(debugErrors.join('-'))}` : '_NoErrorsJustEmpty';
            return NextResponse.redirect(new URL(`/profile?spotify=connected&data_error=INSUFFICIENT_SPOTIFY_DATA&debug=A${artistCount}_G${genreCount}_V${vectorSize}${errorTrace}`, request.url));
        }

        const { error: dbError } = await supabase
            .from('user_music_profiles')
            .upsert({
                user_id: user.id,
                top_artists: processedProfile.top_artists,
                top_genres: processedProfile.top_genres,
                genre_vector: processedProfile.genre_vector,
                recently_played: recentlyPlayedItems.map(t => ({ id: t.id, name: t.name, artist: t.artists?.[0]?.name })),
                saved_tracks: savedTracksItems.map(t => ({ id: t.id, name: t.name, artist: t.artists?.[0]?.name })),
                followed_artists: followedArtistsItems.map(a => ({ id: a.id, name: a.name })),
                is_spotify_linked: true, // Only true if we actually have data
                last_updated: new Date().toISOString(),
            });

        if (dbError) {
            console.error('Error saving music profile:', dbError);
            return NextResponse.redirect(new URL('/profile?error=db_save_failed', request.url));
        }

        const successTrace = debugErrors.length > 0 ? `_E_${encodeURIComponent(debugErrors.join('-'))}` : '';
        return NextResponse.redirect(new URL(`/profile?spotify=connected&debug_success=A${artistCount}_G${genreCount}_V${vectorSize}${successTrace}`, request.url));

    } catch (err: any) {
        console.error('Error in Spotify Callback:', err);

        let errorDetails = 'unknown_error';
        try {
            // Check for specific Spotify error body shapes
            if (err.body) {
                if (err.body.error_description) errorDetails = err.body.error_description;
                else if (err.body.error) {
                    errorDetails = typeof err.body.error === 'object' ? JSON.stringify(err.body.error) : String(err.body.error);
                }
            }

            // If still unknown, check message or serialize full object
            if (errorDetails === 'unknown_error') {
                if (err.message && err.message !== '[object Object]') {
                    errorDetails = err.message;
                } else {
                    errorDetails = JSON.stringify(err, Object.getOwnPropertyNames(err));
                }
            }
        } catch (e) {
            errorDetails = 'failed_to_stringify_error';
        }

        // Append Status Code if available
        if (err.statusCode === 403) {
            errorDetails = 'USER_NOT_ON_WHITELIST';
        } else if (err.statusCode) {
            errorDetails = `[${err.statusCode}] ${errorDetails}`;
        }

        const params = new URLSearchParams();
        params.set('error', 'spotify_callback_failed');
        params.set('details', errorDetails);
        params.set('attempted_uri', redirectUri);

        return NextResponse.redirect(new URL(`/profile?${params.toString()}`, request.url));
    }
}
