const JAMENDO_API_URL = 'https://api.jamendo.com/v3.0';

export interface JamendoTrack {
    id: string;
    name: string;
    artist_name: string;
    audio: string;
    image: string;
    musicinfo: {
        tags: {
            genres: string[];
        };
    };
    duration: number;
}

export async function searchTracks(query: string = '', limit: number = 20): Promise<JamendoTrack[]> {
    const clientId = process.env.NEXT_PUBLIC_JAMENDO_CLIENT_ID;

    // Return mock data if no key is present (Development mode)
    if (!clientId) {
        console.warn('Jamendo Client ID missing, returning mock data.');
        return MOCK_TRACKS;
    }

    try {
        const params = new URLSearchParams({
            client_id: clientId,
            format: 'json',
            limit: limit.toString(),
            search: query,
            include: 'musicinfo'
        });

        const res = await fetch(`${JAMENDO_API_URL}/tracks/?${params.toString()}`);

        if (!res.ok) throw new Error('Failed to fetch from Jamendo');

        const data = await res.json();
        return data.results;
    } catch (error) {
        console.error('Jamendo API Error:', error);
        return [];
    }
}

// Mock Data for "Digital Clay" vibe (lo-fi, chill, instrumental)
const MOCK_TRACKS: JamendoTrack[] = [
    {
        id: 'mock-1',
        name: 'Clay Horizons',
        artist_name: 'Hertz Originals',
        audio: 'https://prod-1.storage.jamendo.com/?trackid=1893771&format=mp31&from=app-devsite',
        image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=300&auto=format&fit=crop',
        musicinfo: { tags: { genres: ['lofi', 'chill'] } },
        duration: 184
    },
    {
        id: 'mock-2',
        name: 'Architectural Silence',
        artist_name: 'Design Wave',
        audio: 'https://prod-1.storage.jamendo.com/?trackid=1890370&format=mp31&from=app-devsite',
        image: 'https://images.unsplash.com/photo-1481277542470-605612bd2d61?q=80&w=300&auto=format&fit=crop',
        musicinfo: { tags: { genres: ['ambient', 'minimal'] } },
        duration: 210
    },
    {
        id: 'mock-3',
        name: 'Urban Echoes',
        artist_name: 'City Sounds',
        audio: 'https://prod-1.storage.jamendo.com/?trackid=1888888&format=mp31&from=app-devsite',
        image: 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=300&auto=format&fit=crop',
        musicinfo: { tags: { genres: ['jazz', 'urban'] } },
        duration: 195
    },
    {
        id: 'mock-4',
        name: 'Digital Sunset',
        artist_name: 'Retro Vibe',
        audio: 'https://prod-1.storage.jamendo.com/?trackid=1877777&format=mp31&from=app-devsite',
        image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop',
        musicinfo: { tags: { genres: ['synthwave', 'electronic'] } },
        duration: 240
    },
    {
        id: 'mock-5',
        name: 'Coffee Shop Vibes',
        artist_name: 'Relax FM',
        audio: 'https://prod-1.storage.jamendo.com/?trackid=1866666&format=mp31&from=app-devsite',
        image: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?q=80&w=300&auto=format&fit=crop',
        musicinfo: { tags: { genres: ['acoustic', 'folk'] } },
        duration: 180
    },
    {
        id: 'mock-6',
        name: 'Deep Focus',
        artist_name: 'Brain Waves',
        audio: 'https://prod-1.storage.jamendo.com/?trackid=1855555&format=mp31&from=app-devsite',
        image: 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?q=80&w=300&auto=format&fit=crop',
        musicinfo: { tags: { genres: ['ambient', 'study'] } },
        duration: 300
    },
    {
        id: 'mock-7',
        name: 'Neon Nights',
        artist_name: 'Cyber Connect',
        audio: 'https://prod-1.storage.jamendo.com/?trackid=1844444&format=mp31&from=app-devsite',
        image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=300&auto=format&fit=crop',
        musicinfo: { tags: { genres: ['cyberpunk', 'electronic'] } },
        duration: 220
    },
    {
        id: 'mock-8',
        name: 'Morning Dew',
        artist_name: 'Nature Sounds',
        audio: 'https://prod-1.storage.jamendo.com/?trackid=1833333&format=mp31&from=app-devsite',
        image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=300&auto=format&fit=crop',
        musicinfo: { tags: { genres: ['nature', 'meditation'] } },
        duration: 250
    },
];
