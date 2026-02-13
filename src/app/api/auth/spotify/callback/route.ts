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

        try {
            const topArtists = await spotifyApi.getMyTopArtists({ limit: 50, time_range: 'medium_term' });
            const topTracks = await spotifyApi.getMyTopTracks({ limit: 50, time_range: 'medium_term' });
            processedProfile = processSpotifyData(topArtists.body.items, topTracks.body.items);
        } catch (dataErr: any) {
            console.error('Failed to fetch Spotify Top Data (likely Premium restricted). Attempting Fallback...', dataErr);

            // FALLBACK STRATEGY: Saved Tracks
            // If we can't get "Top" data, we use "Saved Tracks" (Library) which is usually free.
            try {
                // 1. Fetch Saved Tracks
                const savedTracks = await spotifyApi.getMySavedTracks({ limit: 50 });

                // 2. Extract Artist IDs from tracks
                // We need to fetch artists directly because Track objects don't have Genres.
                const artistIds = new Set<string>();
                const trackObjects: any[] = [];

                savedTracks.body.items.forEach(item => {
                    trackObjects.push(item.track);
                    item.track.artists.forEach(a => artistIds.add(a.id));
                });

                // 3. Fetch Full Artist Details (for Genres)
                // Spotify allows max 50 IDs per call
                const artistIdArray = Array.from(artistIds).slice(0, 50);
                let fullArtists: any[] = [];

                if (artistIdArray.length > 0) {
                    const artistsResponse = await spotifyApi.getArtists(artistIdArray);
                    fullArtists = artistsResponse.body.artists;
                }

                // 4. Process Data using our existing function
                // We pass empty "topArtists" because we are synthesizing them from the library
                // effectively treating the library artists as the "top" artists for this profile.
                processedProfile = processSpotifyData(fullArtists, trackObjects);

                console.log('Fallback successful: Created profile from Saved Tracks');

            } catch (fallbackErr: any) {
                console.error('Fallback failed:', fallbackErr);
                // Capture original error logic for debugging
                try {
                    if (dataErr.body) {
                        if (dataErr.body.error_description) dataErrorDetails = dataErr.body.error_description;
                        else if (dataErr.body.error) {
                            dataErrorDetails = typeof dataErr.body.error === 'object' ? JSON.stringify(dataErr.body.error) : String(dataErr.body.error);
                        }
                    }

                    if (!dataErrorDetails) {
                        if (dataErr.message && dataErr.message !== '[object Object]') {
                            dataErrorDetails = dataErr.message;
                        } else {
                            dataErrorDetails = JSON.stringify(dataErr, Object.getOwnPropertyNames(dataErr));
                        }
                    }
                } catch (e) {
                    dataErrorDetails = 'failed_to_stringify_data_error';
                }

                if (dataErr.statusCode) {
                    dataErrorDetails = `[${dataErr.statusCode}] ${dataErrorDetails}`;
                }
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

        const { error: dbError } = await supabase
            .from('user_music_profiles')
            .upsert({
                user_id: user.id,
                top_artists: processedProfile.top_artists,
                top_genres: processedProfile.top_genres,
                genre_vector: processedProfile.genre_vector,
                is_spotify_linked: true,
                last_updated: new Date().toISOString(),
            });

        if (dbError) {
            console.error('Error saving music profile:', dbError);
            return NextResponse.redirect(new URL('/profile?error=db_save_failed', request.url));
        }

        let redirectUrl = '/profile?spotify=connected';
        if (dataErrorDetails) {
            redirectUrl += `&data_error=${encodeURIComponent(dataErrorDetails)}`;
        }

        return NextResponse.redirect(new URL(redirectUrl, request.url));

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
