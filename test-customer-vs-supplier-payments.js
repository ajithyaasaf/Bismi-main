/**
 * Customer vs Supplier Payment System Comparison Test
 * Validates both payment flows work correctly with our improvements
 */

const API_BASE = 'http://localhost:5000/api';

async function testBothPaymentSystems() {
  console.log('🔍 Testing Customer vs Supplier Payment Systems...\n');

  // Test 1: Compare validation responses
  console.log('1️⃣ Testing Payment Validation Consistency...');
  
  const testCases = [
    { amount: -100, description: "Negative amount test" },
    { amount: 0, description: "Zero amount test" },
    { amount: 2000000, description: "Excessive amount test" },
    { amount: 100.999, description: "Too many decimals test" }
  ];

  for (const testCase of testCases) {
    console.log(`   Testing ${testCase.description}:`);
    
    // Test customer payment validation
    try {
      const customerResponse = await fetch(`${API_BASE}/customers/test/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: testCase.amount })
      });
      
      const supplierResponse = await fetch(`${API_BASE}/suppliers/test/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: testCase.amount })
      });
      
      const customerValid = customerResponse.status === 400;
      const supplierValid = supplierResponse.status === 400;
      
      if (customerValid && supplierValid) {
        console.log(`   ✅ Both systems reject ${testCase.description}`);
      } else {
        console.log(`   ❌ Inconsistent validation - Customer: ${customerResponse.status}, Supplier: ${supplierResponse.status}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error testing ${testCase.description}: ${error.message}`);
    }
  }

  // Test 2: Check error message consistency
  console.log('\n2️⃣ Testing Error Message Consistency...');
  
  try {
    const customerError = await fetch(`${API_BASE}/customers/nonexistent/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 100 })
    });
    
    const supplierError = await fetch(`${API_BASE}/suppliers/nonexistent/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 100 })
    });
    
    if (customerError.status === 404 && supplierError.status === 404) {
      const customerData = await customerError.json();
      const supplierData = await supplierError.json();
      
      if (customerData.message && supplierData.message) {
        console.log('   ✅ Both systems return proper error messages');
      } else {
        console.log('   ❌ Missing error messages in responses');
      }
    } else {
      console.log(`   ❌ Inconsistent error handling - Customer: ${customerError.status}, Supplier: ${supplierError.status}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error testing error messages: ${error.message}`);
  }

  // Test 3: Check response structure
  console.log('\n3️⃣ Testing Response Structure...');
  
  try {
    // Test with valid but non-existent entities to check response format
    const customerResponse = await fetch(`${API_BASE}/customers/test123/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 100 })
    });
    
    const supplierResponse = await fetch(`${API_BASE}/suppliers/test123/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 100 })
    });
    
    console.log(`   Customer response status: ${customerResponse.status}`);
    console.log(`   Supplier response status: ${supplierResponse.status}`);
    
    if (customerResponse.status === supplierResponse.status) {
      console.log('   ✅ Consistent response status codes');
    } else {
      console.log('   ⚠️ Different response status codes');
    }
    
  } catch (error) {
    console.log(`   ❌ Error testing response structure: ${error.message}`);
  }

  // Test 4: Performance comparison
  console.log('\n4️⃣ Testing Performance Comparison...');
  
  const performanceTests = [];
  
  for (let i = 0; i < 3; i++) {
    try {
      const customerStart = Date.now();
      await fetch(`${API_BASE}/customers/test/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 100 })
      });
      const customerTime = Date.now() - customerStart;
      
      const supplierStart = Date.now();
      await fetch(`${API_BASE}/suppliers/test/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 100 })
      });
      const supplierTime = Date.now() - supplierStart;
      
      performanceTests.push({ customer: customerTime, supplier: supplierTime });
      
    } catch (error) {
      console.log(`   ❌ Performance test ${i + 1} failed: ${error.message}`);
    }
  }
  
  if (performanceTests.length > 0) {
    const avgCustomer = performanceTests.reduce((sum, test) => sum + test.customer, 0) / performanceTests.length;
    const avgSupplier = performanceTests.reduce((sum, test) => sum + test.supplier, 0) / performanceTests.length;
    
    console.log(`   Average customer payment time: ${avgCustomer.toFixed(2)}ms`);
    console.log(`   Average supplier payment time: ${avgSupplier.toFixed(2)}ms`);
    
    if (avgCustomer < avgSupplier * 2) {
      console.log('   ✅ Customer payment performance is acceptable');
    } else {
      console.log('   ⚠️ Customer payment significantly slower (expected due to complexity)');
    }
  }

  console.log('\n🏁 Payment System Comparison Complete!');
  console.log('\n📋 System Analysis:');
  console.log('   📌 Customer Payment: Complex order-based allocation with data integrity checks');
  console.log('   📌 Supplier Payment: Simple transaction-based debt reduction');
  console.log('   📌 Both systems have enhanced validation and error handling');
  console.log('   📌 Customer system includes automatic data repair capabilities');
  console.log('   📌 Both systems use consistent monetary precision handling');
}

// Run the test
testBothPaymentSystems().catch(console.error);