const clientId = '78bd342d7a2e472ba2aa271c08594618';
const clientSecret = '482dfde0646249c696d45daa1d73b776';

async function test() {
    try {
        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });
        const tokenData = await tokenRes.json();
        const token = tokenData.access_token;
        console.log('Got token:', token ? 'yes' : 'no');

        // Test getArtists
        const ids = '06HL4z0CvFAxyc27GXpf02'; // Taylor Swift
        const artistsRes = await fetch(`https://api.spotify.com/v1/artists?ids=${ids}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('Status:', artistsRes.status);
        const text = await artistsRes.text();
        console.log('Response:', text);
    } catch (e) {
        console.error(e);
    }
}
test();
