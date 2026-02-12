import SpotifyWebApi from 'spotify-web-api-node';

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.SPOTIFY_REDIRECT_URI;

export const spotifyApi = new SpotifyWebApi({
    clientId: client_id,
    clientSecret: client_secret,
    redirectUri: redirect_uri,
});

export interface ProcessedMusicProfile {
    top_artists: { name: string; id: string; genres: string[]; image: string }[];
    top_genres: { name: string; count: number }[];
    genre_vector: Record<string, number>;
}

export function processSpotifyData(
    topArtists: SpotifyApi.ArtistObjectFull[],
    topTracks: SpotifyApi.TrackObjectFull[]
): ProcessedMusicProfile {
    const artistsMap = new Map<string, { name: string; id: string; genres: string[]; image: string }>();
    const genreCounts: Record<string, number> = {};

    // Process top artists from direct artist endpoint
    topArtists.forEach((artist) => {
        artistsMap.set(artist.id, {
            name: artist.name,
            id: artist.id,
            genres: artist.genres,
            image: artist.images[0]?.url || '',
        });

        artist.genres.forEach((genre) => {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
    });

    // Also include artists from top tracks if not already present, to get more genre data if possible
    // Note: Track objects usually have simplified artist objects which don't have genres directly.
    // Converting track artists to full artists requires another API call, which we might skip for speed 
    // or do in batch if really needed.
    // For now, relies on the user's top artists endpoint which is the primary source of 'taste'.

    // Normalize genre vector
    const totalGenres = Object.values(genreCounts).reduce((a, b) => a + b, 0);
    const genreVector: Record<string, number> = {};

    if (totalGenres > 0) {
        for (const [genre, count] of Object.entries(genreCounts)) {
            genreVector[genre] = count / totalGenres;
        }
    }

    const sortedGenres = Object.entries(genreCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([name, count]) => ({ name, count }));

    return {
        top_artists: Array.from(artistsMap.values()),
        top_genres: sortedGenres,
        genre_vector: genreVector,
    };
}
