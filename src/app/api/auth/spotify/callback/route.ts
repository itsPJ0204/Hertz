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

        // Fetch User Data (Resilient)
        let processedProfile = {
            top_artists: [] as any[],
            top_genres: [] as any[],
            genre_vector: {} as Record<string, number>
        };
        let dataErrorDetails = '';

        // Fetch User Data with Granular Logging
        let processedProfile = {
            top_artists: [] as any[],
            top_genres: [] as any[],
            genre_vector: {} as Record<string, number>
        };

        let topArtistsItems: any[] = [];
        let topTracksItems: any[] = [];

        // 1. Try Top Artists
        try {
            const topArtists = await spotifyApi.getMyTopArtists({ limit: 50, time_range: 'medium_term' });
            topArtistsItems = topArtists.body.items;
            console.log(`[Spotify] Fetched ${topArtistsItems.length} Top Artists`);
        } catch (e: any) {
            console.error('[Spotify] Failed to fetch Top Artists:', e.message || e);
            if (e.statusCode) console.error(`[Spotify] Top Artists Status: ${e.statusCode}`);
        }

        // 2. Try Top Tracks
        try {
            const topTracks = await spotifyApi.getMyTopTracks({ limit: 50, time_range: 'medium_term' });
            topTracksItems = topTracks.body.items;
            console.log(`[Spotify] Fetched ${topTracksItems.length} Top Tracks`);
        } catch (e: any) {
            console.error('[Spotify] Failed to fetch Top Tracks:', e.message || e);
            if (e.statusCode) console.error(`[Spotify] Top Tracks Status: ${e.statusCode}`);
        }

        // 3. Process what we have so far
        if (topArtistsItems.length > 0 || topTracksItems.length > 0) {
            processedProfile = processSpotifyData(topArtistsItems, topTracksItems);
        }

        // 4. Backfill from Top Tracks if Artists are missing
        if (processedProfile.top_artists.length === 0 && topTracksItems.length > 0) {
            console.log('[Spotify] top_artists is empty. Attempting backfill from Top Tracks...');
            const artistIds = new Set<string>();
            topTracksItems.forEach((t: any) => t.artists.forEach((a: any) => artistIds.add(a.id)));
            const artistIdArray = Array.from(artistIds).slice(0, 50);

            if (artistIdArray.length > 0) {
                try {
                    const artistsResponse = await spotifyApi.getArtists(artistIdArray);
                    topArtistsItems = artistsResponse.body.artists;
                    console.log(`[Spotify] Backfilled ${topArtistsItems.length} artists from Top Tracks`);
                    processedProfile = processSpotifyData(topArtistsItems, topTracksItems);
                } catch (e) {
                    console.error('[Spotify] Failed to fetch backfill artists:', e);
                }
            }
        }

        // 5. Hard Fallback: Saved Tracks
        if (processedProfile.top_artists.length === 0) {
            console.log('[Spotify] Still no artists. Attempting Saved Tracks (Library)...');
            try {
                const savedTracks = await spotifyApi.getMySavedTracks({ limit: 50 });
                const savedItems = savedTracks.body.items.map((i: any) => i.track);
                console.log(`[Spotify] Fetched ${savedItems.length} Saved Tracks`);

                // Extract Artists
                const artistIds = new Set<string>();
                savedItems.forEach((t: any) => t.artists.forEach((a: any) => artistIds.add(a.id)));
                const artistIdArray = Array.from(artistIds).slice(0, 50);

                if (artistIdArray.length > 0) {
                    const artistsResponse = await spotifyApi.getArtists(artistIdArray);
                    const libArtists = artistsResponse.body.artists;
                    console.log(`[Spotify] Fetched ${libArtists.length} artists from Library`);
                    processedProfile = processSpotifyData(libArtists, savedItems);
                }
            } catch (e: any) {
                console.error('[Spotify] Failed to fetch Saved Tracks:', e.message || e);
                if (e.statusCode) console.error(`[Spotify] Saved Tracks Status: ${e.statusCode}`);
            }
        }

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
            return NextResponse.redirect(new URL(`/profile?spotify=connected&data_error=INSUFFICIENT_SPOTIFY_DATA&debug=A${artistCount}_G${genreCount}_V${vectorSize}`, request.url));
        }

        const { error: dbError } = await supabase
            .from('user_music_profiles')
            .upsert({
                user_id: user.id,
                top_artists: processedProfile.top_artists,
                top_genres: processedProfile.top_genres,
                genre_vector: processedProfile.genre_vector,
                is_spotify_linked: true, // Only true if we actually have data
                last_updated: new Date().toISOString(),
            });

        if (dbError) {
            console.error('Error saving music profile:', dbError);
            return NextResponse.redirect(new URL('/profile?error=db_save_failed', request.url));
        }

        return NextResponse.redirect(new URL('/profile?spotify=connected', request.url));

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
