const SpotifyWebApi = require('spotify-web-api-node');

const api = new SpotifyWebApi({
    clientId: '78bd342d7a2e472ba2aa271c08594618',
    clientSecret: '482dfde0646249c696d45daa1d73b776'
});

api.clientCredentialsGrant()
    .then(data => {
        api.setAccessToken(data.body['access_token']);
        return api.getArtists(['06HL4z0CvFAxyc27GXpf02', '1Xyo4u8uXC1ZmMpatF05PJ', '1uNFoZAHBGtllmzznpCI3s']);
    })
    .then(data => {
        console.log("ARTISTS FETCHED SUCCESSFULLY");
        const results = data.body.artists.map(a => ({
            name: a.name,
            genres: a.genres
        }));
        console.log(JSON.stringify(results, null, 2));
    })
    .catch(console.error);
