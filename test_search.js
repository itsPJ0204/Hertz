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

        // Test search endpoint
        const searchRes = await fetch(`https://api.spotify.com/v1/search?q=taylor%20swift&type=artist&limit=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('Search Status:', searchRes.status);
        const searchData = await searchRes.json();
        console.log('Search Response:', JSON.stringify(searchData, null, 2));
    } catch (e) {
        console.error(e);
    }
}
test();
