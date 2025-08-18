// Quick test script to debug the date handling bug
import fetch from 'node-fetch';

async function testDateBug() {
  try {
    // Test creating an order with a past date (2024-01-15)
    const testDate = new Date('2024-01-15T10:30:00');
    console.log('Creating test order with date:', testDate.toISOString());
    
    const orderData = {
      customerId: 'test-customer-id',
      items: [{
        type: 'whole-chicken',
        quantity: 1,
        rate: 300
      }],
      totalAmount: 300,
      paidAmount: 100,
      paymentStatus: 'partial',
      orderStatus: 'completed',
      createdAt: testDate.toISOString()
    };
    
    // Create order
    const createResponse = await fetch('http://localhost:5000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });
    
    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error('Failed to create order:', error);
      return;
    }
    
    const createdOrder = await createResponse.json();
    console.log('Created order response:', JSON.stringify(createdOrder, null, 2));
    
    // Wait a moment then fetch all orders to see what date is stored
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const fetchResponse = await fetch('http://localhost:5000/api/orders');
    if (!fetchResponse.ok) {
      console.error('Failed to fetch orders');
      return;
    }
    
    const response = await fetchResponse.json();
    console.log('GET orders response structure:', typeof response, Array.isArray(response));
    
    const orders = response.success ? response.data : response;
    console.log('Orders array:', orders.length, 'orders found');
    
    const testOrder = orders.find(order => order.id === createdOrder.data.id);
    
    if (testOrder) {
      console.log('Retrieved order from database:', JSON.stringify(testOrder, null, 2));
      console.log('Expected date:', testDate.toISOString());
      console.log('Actual date from DB:', testOrder.createdAt);
      console.log('Dates match:', new Date(testOrder.createdAt).getTime() === testDate.getTime());
    } else {
      console.log('Test order not found in database');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testDateBug();