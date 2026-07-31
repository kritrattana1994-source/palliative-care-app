const http = require('http');

function postJSON(path, body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

function getJSON(path, token = null) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
      headers: headers
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.end();
  });
}

async function runTests() {
  console.log("=== Starting API Tests ===");
  
  // Test 1: Login
  console.log("Test 1: Logging in as admin...");
  try {
    const loginRes = await postJSON('/api/auth/login', { username: 'admin', password: 'password123' });
    console.log("Status:", loginRes.status);
    if (loginRes.status !== 200 || !loginRes.body.token) {
      console.error("FAILED Test 1:", loginRes.body);
      process.exit(1);
    }
    console.log("SUCCESS. Token acquired:", loginRes.body.token.substring(0, 20) + "...");
    const token = loginRes.body.token;

    // Test 2: Get Patients
    console.log("\nTest 2: Getting patients list...");
    const patientsRes = await getJSON('/api/patients', token);
    console.log("Status:", patientsRes.status);
    if (patientsRes.status !== 200 || !Array.isArray(patientsRes.body)) {
      console.error("FAILED Test 2:", patientsRes.body);
      process.exit(1);
    }
    console.log(`SUCCESS. Found ${patientsRes.body.length} patients.`);
    console.log("Patient 1 Name:", patientsRes.body[0].name);

    // Test 3: Verify Token (Public)
    console.log("\nTest 3: Verifying patient token (somsri_token)...");
    const verifyRes = await getJSON('/api/verify-token/somsri_token');
    console.log("Status:", verifyRes.status);
    if (verifyRes.status !== 200) {
      console.error("FAILED Test 3:", verifyRes.body);
      process.exit(1);
    }
    console.log("SUCCESS. Patient name:", verifyRes.body.name);

    console.log("\n=== ALL TESTS COMPLETED SUCCESSFULLY ===");
  } catch (err) {
    console.error("Network error during API tests:", err.message);
    process.exit(1);
  }
}

// Wait 2 seconds for server to be fully ready before testing
setTimeout(runTests, 2000);
