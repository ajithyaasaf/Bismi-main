// Simple test to verify transactions API endpoint
const testUrl = 'https://bismi-main-76ww.onrender.com/api/transactions';

fetch(testUrl)
  .then(response => {
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    return response.text();
  })
  .then(text => {
    console.log('Response body:', text.substring(0, 200));
    try {
      const json = JSON.parse(text);
      console.log('Valid JSON response with', json.length, 'transactions');
    } catch (e) {
      console.log('Invalid JSON response - might be HTML');
    }
  })
  .catch(error => {
    console.error('Network error:', error);
  });