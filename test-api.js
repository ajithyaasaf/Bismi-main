// API Testing Script for Production Backend
const RENDER_BASE_URL = 'https://bismi-main.onrender.com';

async function testEndpoint(endpoint, description) {
  try {
    console.log(`Testing ${description}...`);
    const response = await fetch(`${RENDER_BASE_URL}/api/${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://bismi-chicken-shop.vercel.app'
      }
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log(`Data:`, Array.isArray(data) ? `Array with ${data.length} items` : data);
    } else {
      const text = await response.text();
      console.log(`Non-JSON Response:`, text.substring(0, 200));
    }
    
    console.log('---');
    return response.ok;
  } catch (error) {
    console.error(`Error testing ${description}:`, error.message);
    console.log('---');
    return false;
  }
}

async function runTests() {
  console.log('Testing Bismi Backend API Endpoints\n');
  
  const tests = [
    ['health', 'Health Check'],
    ['suppliers', 'Suppliers List'],
    ['customers', 'Customers List'],
    ['inventory', 'Inventory List'],
    ['orders', 'Orders List'],
    ['transactions', 'Transactions List']
  ];
  
  for (const [endpoint, description] of tests) {
    await testEndpoint(endpoint, description);
    await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
  }
}

runTests();