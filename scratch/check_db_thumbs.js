const https = require('https');

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const id = 'j6V8NPAqIzF';
  const url = `https://www.eporner.com/api/v2/video/id/?id=${id}&format=json`;
  try {
    const data = await getJson(url);
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}

main().catch(console.error);
