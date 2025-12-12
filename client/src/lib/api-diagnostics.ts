import { getApiUrl } from './config';

// API diagnostics to help identify connection issues
export async function diagnoseApiConnection() {
  const endpoints = [
    getApiUrl('/api/transactions'),
    getApiUrl('/api/health'),
    getApiUrl('/api/suppliers'),
    getApiUrl('/api/customers')
  ];

  const results = [];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing endpoint: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        mode: 'cors'
      });

      const contentType = response.headers.get('content-type') || 'unknown';
      const statusText = response.statusText;
      
      let responseData = null;
      let responseText = '';
      
      try {
        if (contentType.includes('application/json')) {
          responseData = await response.json();
        } else {
          responseText = await response.text();
        }
      } catch (parseError) {
        responseText = 'Failed to parse response';
      }

      results.push({
        endpoint,
        status: response.status,
        statusText,
        contentType,
        isJson: contentType.includes('application/json'),
        responseData,
        responseText: responseText.substring(0, 200),
        success: response.ok && contentType.includes('application/json')
      });

    } catch (error) {
      results.push({
        endpoint,
        error: error.message,
        success: false
      });
    }
  }

  console.table(results);
  return results;
}

// Simple transaction fetch with detailed logging
export async function fetchTransactionsWithDiagnostics() {
  console.log('Starting transaction fetch with diagnostics...');
  
  try {
    const url = getApiUrl('/api/transactions');
    console.log(`Fetching from: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      mode: 'cors'
    });

    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));
    
    const contentType = response.headers.get('content-type');
    console.log(`Content-Type: ${contentType}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP Error ${response.status}:`, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response received:', text.substring(0, 500));
      throw new Error('Server returned HTML instead of JSON');
    }
    
    const data = await response.json();
    console.log(`Received data type: ${typeof data}, isArray: ${Array.isArray(data)}`);
    
    if (Array.isArray(data)) {
      console.log(`Successfully fetched ${data.length} transactions`);
      return data;
    } else {
      console.error('Data is not an array:', data);
      throw new Error('Invalid data format received');
    }
    
  } catch (error) {
    console.error('Transaction fetch failed:', error);
    throw error;
  }
}