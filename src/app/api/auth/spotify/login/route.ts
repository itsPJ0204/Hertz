import { NextResponse } from 'next/server';
import SpotifyWebApi from 'spotify-web-api-node';

export async function GET(request: Request) {
    const { origin } = new URL(request.url);
    const redirectUri = `${origin}/api/auth/spotify/callback`;

    const spotifyApi = new SpotifyWebApi({
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        redirectUri,
    });

    const scopes = [
        'user-read-private',
        'user-read-email',
        'user-top-read',
        'user-library-read', // Fallback for free accounts
    ];

    const state = 'some-state-of-my-choice'; // TODO: Generate random string for security
    const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state, true);

    return NextResponse.redirect(authorizeURL);
}
