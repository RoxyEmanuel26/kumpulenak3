const https = require('https');

function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve(res.statusCode);
    }).on('error', (e) => {
      resolve(500);
    });
  });
}

async function main() {
  const code = await checkUrl('https://static-ca-cdn.eporner.com/hd-thumbs/KxL7NA0MQTh/2.jpg');
  console.log('Result:', code);
}

main().catch(console.error);
