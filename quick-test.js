/**
 * Quick Test Script - Palliative Care App
 * ทดสอบ Backend API ว่าพร้อมใช้งานหรือไม่
 */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxHJUmh_et7Ap948HYfuJsMUdThQfCk98cVna9dEk_1dDSCY86J8y3w51gETzyb06hGMA/exec';

console.log('🧪 Testing Palliative Care App Backend...\n');

async function testLogin() {
  console.log('📝 Test 1: Login API');
  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?path=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    const data = await response.json();
    
    if (data.success && data.token) {
      console.log('✅ Login successful!');
      console.log(`   Token: ${data.token.substring(0, 30)}...`);
      console.log(`   User: ${data.user.username} (${data.user.role})\n`);
      return data.token;
    } else {
      console.log('❌ Login failed:', data.error || 'Unknown error\n');
      return null;
    }
  } catch (error) {
    console.log('❌ Login error:', error.message);
    console.log('   ⚠️  Check if Apps Script is deployed with "Anyone" access\n');
    return null;
  }
}

async function testPatients(token) {
  console.log('📝 Test 2: Get Patients API');
  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?path=patients`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (data.success && Array.isArray(data.patients)) {
      console.log(`✅ Patients API working! Found ${data.patients.length} patients`);
      if (data.patients.length > 0) {
        console.log(`   First patient: ${data.patients[0].name} (HN: ${data.patients[0].hn})`);
      }
      console.log('');
      return true;
    } else {
      console.log('❌ Patients API failed:', data.error || 'Unknown error\n');
      return false;
    }
  } catch (error) {
    console.log('❌ Patients API error:', error.message + '\n');
    return false;
  }
}

async function testForm() {
  console.log('📝 Test 3: ESAS Form (HTML)');
  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?token=test_token_123`);
    const html = await response.text();
    
    if (html.includes('ESAS') || html.includes('แบบประเมิน')) {
      console.log('✅ ESAS Form HTML is accessible');
      console.log(`   Form size: ${(html.length / 1024).toFixed(1)} KB\n`);
      return true;
    } else {
      console.log('❌ ESAS Form not found in response\n');
      return false;
    }
  } catch (error) {
    console.log('❌ Form access error:', error.message + '\n');
    return false;
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Palliative Care App - Backend API Test');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const token = await testLogin();
  
  if (token) {
    await testPatients(token);
  } else {
    console.log('⚠️  Skipping patient test (no token)\n');
  }
  
  await testForm();
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Test Summary');
  console.log('═══════════════════════════════════════════════════════\n');
  
  if (token) {
    console.log('✅ Backend is ready!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run frontend: cd frontend && npm run dev');
    console.log('2. Open: http://localhost:5173/login');
    console.log('3. Login: admin / admin123');
    console.log('4. Test the system!');
  } else {
    console.log('❌ Backend is NOT ready!');
    console.log('');
    console.log('Please check:');
    console.log('1. Open Apps Script Editor');
    console.log('2. Deploy → Manage deployments');
    console.log('3. Edit deployment → Who has access: "Anyone"');
    console.log('4. Run this test again');
  }
  
  console.log('\n═══════════════════════════════════════════════════════\n');
}

// Run tests
runTests().catch(console.error);
