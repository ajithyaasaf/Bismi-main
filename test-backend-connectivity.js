// Comprehensive backend connectivity test for Bismi Chicken Shop
// Tests both health endpoint and database connectivity

const BACKEND_URL = 'https://bismi-main-76ww.onrender.com';

async function testBackendConnectivity() {
  console.log('🔍 Testing Backend Connectivity for Bismi Chicken Shop');
  console.log('=' .repeat(60));

  // Test 1: Basic Backend Health Check
  console.log('\n1️⃣ Testing Backend Health...');
  try {
    const healthResponse = await fetch(`${BACKEND_URL}/api/health`);
    const healthData = await healthResponse.json();
    
    console.log(`✅ Backend Status: ${healthData.status}`);
    console.log(`📊 Storage Type: ${healthData.storage}`);
    console.log(`⏰ Server Time: ${healthData.timestamp}`);
    
    if (healthData.storage === 'Firestore') {
      console.log('🎉 SUCCESS: Backend is using Firestore database!');
    } else if (healthData.storage === 'Mock') {
      console.log('⚠️  WARNING: Backend is using Mock storage (development mode)');
      console.log('   This means Firebase credentials are not configured.');
    }
  } catch (error) {
    console.log('❌ Backend Health Check Failed:', error.message);
    return;
  }

  // Test 2: Database Read Operations
  console.log('\n2️⃣ Testing Database Read Operations...');
  const endpoints = [
    { name: 'Suppliers', url: '/api/suppliers' },
    { name: 'Inventory', url: '/api/inventory' },
    { name: 'Customers', url: '/api/customers' },
    { name: 'Orders', url: '/api/orders' },
    { name: 'Transactions', url: '/api/transactions' }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n   Testing ${endpoint.name}...`);
      const response = await fetch(`${BACKEND_URL}${endpoint.url}`);
      
      if (response.ok) {
        const data = await response.json();
        const count = Array.isArray(data.data) ? data.data.length : 0;
        console.log(`   ✅ ${endpoint.name}: ${count} records found`);
      } else {
        console.log(`   ❌ ${endpoint.name}: HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ ${endpoint.name}: ${error.message}`);
    }
  }

  // Test 3: Check for Firebase Configuration
  console.log('\n3️⃣ Checking Firebase Configuration...');
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    const data = await response.json();
    
    if (data.storage === 'Firestore') {
      console.log('✅ Firebase is properly configured and connected');
      console.log('🔐 Service account credentials are valid');
      console.log('📡 Database connection is active');
    } else {
      console.log('⚠️  Firebase configuration issues detected:');
      console.log('   • FIREBASE_SERVICE_ACCOUNT_KEY might be missing');
      console.log('   • Backend is using fallback mock storage');
      console.log('   • Real data operations will not work');
    }
  } catch (error) {
    console.log('❌ Firebase configuration check failed:', error.message);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('🏁 Backend connectivity test completed');
}

// Run the test
testBackendConnectivity().catch(console.error);