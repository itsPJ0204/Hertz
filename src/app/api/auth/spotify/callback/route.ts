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

        // Fetch User Data
        const me = await spotifyApi.getMe();
        const topArtists = await spotifyApi.getMyTopArtists({ limit: 50, time_range: 'medium_term' });
        const topTracks = await spotifyApi.getMyTopTracks({ limit: 50, time_range: 'medium_term' });

        // Process Data
        const processedProfile = processSpotifyData(topArtists.body.items, topTracks.body.items);

        // Store in Supabase
        const supabase = await createClient();
        let user;
        try {
            const { data } = await supabase.auth.getUser();
            user = data.user;
        } catch (authError: any) {
            const isRefreshError = authError?.code === 'refresh_token_not_found' ||
                authError?.message?.includes('refresh_token_not_found') ||
                JSON.stringify(authError).includes('refresh_token_not_found');

            if (isRefreshError) {
                // Squelch the error and clear the session
                await supabase.auth.signOut();
            } else {
                console.error('Auth error retrieving user:', authError);
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

        return NextResponse.redirect(new URL('/profile?spotify=connected', request.url));

    } catch (err: any) {
        console.error('Something went wrong!', err);
        const errorMessage = err.message ? encodeURIComponent(err.message) : 'unknown_error';
        // Also check specifics like "Invalid redirect URI" which often comes in body
        const detailedError = err.body?.error_description || err.body?.error || errorMessage;

        return NextResponse.redirect(new URL(`/profile?error=spotify_callback_failed&details=${encodeURIComponent(detailedError)}`, request.url));
    }
}
