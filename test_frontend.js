const http = require('http');

function checkFrontend() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5173,
      path: '/',
      method: 'GET',
      timeout: 2000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, length: data.length });
      });
    });

    req.on('error', (e) => reject(e));
    req.end();
  });
}

async function run() {
  console.log("Waiting for Vite dev server to start...");
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    const res = await checkFrontend();
    console.log("Vite dev server is UP! Status:", res.status, "HTML length:", res.length);
    process.exit(0);
  } catch (err) {
    console.error("Vite dev server is DOWN:", err.message);
    process.exit(1);
  }
}

run();
