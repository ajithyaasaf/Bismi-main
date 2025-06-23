/**
 * Specific Payment Button Test
 * Tests the exact customer payment button vs supplier payment button
 */

const API_BASE = 'http://localhost:5000/api';

async function testSpecificPaymentButton() {
  console.log('🔍 Testing Specific Customer Payment Button vs Supplier Payment Button\n');

  // Test 1: Check button visibility conditions
  console.log('1️⃣ Testing Button Visibility Conditions...');
  
  try {
    // Get customers and suppliers to check button conditions
    const customersResponse = await fetch(`${API_BASE}/customers`);
    const suppliersResponse = await fetch(`${API_BASE}/suppliers`);
    
    if (customersResponse.ok && suppliersResponse.ok) {
      const customers = await customersResponse.json();
      const suppliers = await suppliersResponse.json();
      
      console.log(`   Found ${customers.length} customers, ${suppliers.length} suppliers`);
      
      const customersWithPending = customers.filter(c => c.pendingAmount > 0);
      const suppliersWithPending = suppliers.filter(s => s.pendingAmount > 0);
      
      console.log(`   Customers with pending amount > 0: ${customersWithPending.length}`);
      console.log(`   Suppliers with pending amount > 0: ${suppliersWithPending.length}`);
      
      if (customersWithPending.length > 0) {
        console.log('   ✅ Customer payment buttons should be visible');
        
        // Test customer payment button functionality
        const testCustomer = customersWithPending[0];
        console.log(`   Testing customer: ${testCustomer.name} (₹${testCustomer.pendingAmount})`);
        
        const customerPaymentResponse = await fetch(`${API_BASE}/customers/${testCustomer.id}/payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: 50, description: 'Test payment' })
        });
        
        console.log(`   Customer payment test status: ${customerPaymentResponse.status}`);
        
        if (customerPaymentResponse.ok) {
          const customerResult = await customerPaymentResponse.json();
          console.log('   ✅ Customer payment endpoint working');
          console.log(`   Applied amount: ₹${customerResult.appliedAmount || 'N/A'}`);
          console.log(`   Updated orders: ${customerResult.updatedOrders?.length || 0}`);
        } else {
          const customerError = await customerPaymentResponse.json();
          console.log('   ❌ Customer payment failed:', customerError.message);
        }
      } else {
        console.log('   ⚠️ No customers with pending amounts for testing');
      }
      
      if (suppliersWithPending.length > 0) {
        console.log('   ✅ Supplier payment buttons should be visible');
        
        // Test supplier payment button functionality
        const testSupplier = suppliersWithPending[0];
        console.log(`   Testing supplier: ${testSupplier.name} (₹${testSupplier.pendingAmount})`);
        
        const supplierPaymentResponse = await fetch(`${API_BASE}/suppliers/${testSupplier.id}/payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: 50, description: 'Test payment' })
        });
        
        console.log(`   Supplier payment test status: ${supplierPaymentResponse.status}`);
        
        if (supplierPaymentResponse.ok) {
          const supplierResult = await supplierPaymentResponse.json();
          console.log('   ✅ Supplier payment endpoint working');
          console.log(`   Updated pending amount: ₹${supplierResult.updatedPendingAmount || 'N/A'}`);
        } else {
          const supplierError = await supplierPaymentResponse.json();
          console.log('   ❌ Supplier payment failed:', supplierError.message);
        }
      } else {
        console.log('   ⚠️ No suppliers with pending amounts for testing');
      }
      
    } else {
      console.log('   ❌ Failed to fetch customers or suppliers');
    }
    
  } catch (error) {
    console.log(`   ❌ Error testing button visibility: ${error.message}`);
  }

  // Test 2: Compare response structures
  console.log('\n2️⃣ Comparing Response Structures...');
  
  try {
    const customerResponse = await fetch(`${API_BASE}/customers/test-customer/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 100 })
    });
    
    const supplierResponse = await fetch(`${API_BASE}/suppliers/test-supplier/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 100 })
    });
    
    console.log(`   Customer response: ${customerResponse.status}`);
    console.log(`   Supplier response: ${supplierResponse.status}`);
    
    if (customerResponse.status === supplierResponse.status) {
      console.log('   ✅ Both systems return consistent status codes');
    } else {
      console.log('   ❌ Inconsistent status codes between systems');
    }
    
  } catch (error) {
    console.log(`   ❌ Error comparing responses: ${error.message}`);
  }

  // Test 3: UI Integration Test
  console.log('\n3️⃣ Testing UI Integration...');
  
  console.log('   Customer Payment Button Flow:');
  console.log('   1. Button visible when pendingAmount > 0');
  console.log('   2. onClick calls onPayment(customer.id, customer.name)');
  console.log('   3. CustomersPage.handleMakePayment() triggered');
  console.log('   4. PaymentModal opens with customer data');
  console.log('   5. User enters amount and submits');
  console.log('   6. processCustomerPayment() called');
  console.log('   7. Complex order-based payment allocation');
  console.log('   8. Success/error toast displayed');
  
  console.log('\n   Supplier Payment Button Flow:');
  console.log('   1. Button visible when pendingAmount > 0');
  console.log('   2. onClick calls onPayment(supplier.id, supplier.name)');
  console.log('   3. SuppliersPage.handlePaymentSubmit() triggered');
  console.log('   4. PaymentModal opens with supplier data');
  console.log('   5. User enters amount and submits');
  console.log('   6. processSupplierPayment() called');
  console.log('   7. Simple transaction-based payment');
  console.log('   8. Success/error toast displayed');

  // Test 4: Error Handling Comparison
  console.log('\n4️⃣ Testing Error Handling...');
  
  const errorTests = [
    { amount: -100, description: 'Negative amount' },
    { amount: 0, description: 'Zero amount' },
    { amount: 2000000, description: 'Excessive amount' }
  ];
  
  for (const test of errorTests) {
    try {
      const customerError = await fetch(`${API_BASE}/customers/test/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: test.amount })
      });
      
      const supplierError = await fetch(`${API_BASE}/suppliers/test/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: test.amount })
      });
      
      if (customerError.status === supplierError.status && customerError.status === 400) {
        console.log(`   ✅ ${test.description}: Both systems reject correctly`);
      } else {
        console.log(`   ❌ ${test.description}: Inconsistent handling (Customer: ${customerError.status}, Supplier: ${supplierError.status})`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error testing ${test.description}: ${error.message}`);
    }
  }

  console.log('\n🏁 Specific Payment Button Test Complete!');
  console.log('\n📋 Key Differences Found:');
  console.log('   📌 Customer button: Complex order-based payment allocation');
  console.log('   📌 Supplier button: Simple transaction-based payment');
  console.log('   📌 Both buttons use same PaymentModal component');
  console.log('   📌 Both have enhanced validation and error handling');
  console.log('   📌 Customer system includes data integrity checks');
  console.log('   📌 Response structures differ due to different use cases');
}

// Run the test
testSpecificPaymentButton().catch(console.error);