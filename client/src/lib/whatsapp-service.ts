import { apiRequest, safeJsonResponse } from './queryClient';

/**
 * WhatsApp service with accurate pending amount calculations
 */

// Create WhatsApp message for customer with real-time data
export async function createCustomerWhatsAppMessage(customerId: string, includeOrderDetails: boolean = true): Promise<string | null> {
  try {
    // Get real-time customer data with accurate pending amounts
    const response = await apiRequest('GET', `/api/customers/${customerId}/whatsapp`);
    const customerData = await safeJsonResponse(response);
    
    if (!customerData || !customerData.contact) {
      return null;
    }

    // Clean the phone number (remove spaces, dashes, etc.)
    let phoneNumber = customerData.contact.replace(/[\s-()]/g, '');
    
    // Smart country code handling
    if (!phoneNumber.startsWith('+')) {
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '+91' + phoneNumber.substring(1);
      } else if (!phoneNumber.startsWith('91')) {
        phoneNumber = '+91' + phoneNumber;
      } else if (phoneNumber.startsWith('91')) {
        phoneNumber = '+' + phoneNumber;
      }
    }

    // Create the message with accurate data
    let message = `*BISMI CHICKEN SHOP*\n\nHello ${customerData.name},`;
    
    // Add pending amount info with real-time calculation
    if (customerData.pendingAmount && customerData.pendingAmount > 0) {
      message += `\n\n*Current Pending Amount: ₹${customerData.pendingAmount.toFixed(2)}*`;
    }
    
    // Add recent order details if available and requested
    if (includeOrderDetails && customerData.recentOrders && customerData.recentOrders.length > 0) {
      const latestOrder = customerData.recentOrders[0];
      
      const orderDate = new Date(latestOrder.createdAt);
      const formattedDate = orderDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric', 
        year: 'numeric'
      });
      
      message += `\n\n*Recent Order:*`;
      message += `\n📅 Date: ${formattedDate}`;
      message += `\n💰 Amount: ₹${(latestOrder.totalAmount || 0).toFixed(2)}`;
      message += `\n📦 Status: ${latestOrder.paymentStatus === 'paid' ? 'Paid' : 'Pending'}`;
      
      if (latestOrder.items && latestOrder.items.length > 0) {
        message += `\n\n*Items Purchased:*`;
        latestOrder.items.forEach((item: any) => {
          const itemDetails = item.details ? ` - ${item.details}` : '';
          const itemTotal = ((item.quantity || 0) * (item.rate || 0)).toFixed(2);
          message += `\n• ${(item.quantity || 0).toFixed(2)} kg ${item.type}${itemDetails}`;
          message += `\n  Rate: ₹${(item.rate || 0).toFixed(2)}/kg | Total: ₹${itemTotal}`;
        });
      }
    }
    
    // Add appropriate closing message
    if (customerData.pendingAmount && customerData.pendingAmount > 0) {
      message += `\n\nThis is a friendly reminder about your pending payment. Please settle at your earliest convenience.`;
    } else {
      message += `\n\nThank you for your business with us.`;
    }
    
    message += `\n\nFor any queries, please contact us.`;
    
    // Create the WhatsApp URL
    const whatsappUrl = `https://wa.me/${phoneNumber.replace('+', '')}?text=${encodeURIComponent(message)}`;
    
    return whatsappUrl;
  } catch (error) {
    console.error("Error creating WhatsApp message:", error);
    return null;
  }
}

// Create WhatsApp message for specific order
export async function createOrderWhatsAppMessage(customerId: string, orderId: string): Promise<string | null> {
  try {
    // Get customer data and order details
    const [customerResponse, orderResponse] = await Promise.all([
      apiRequest('GET', `/api/customers/${customerId}/whatsapp`),
      apiRequest('GET', `/api/orders/${orderId}`)
    ]);

    const customerData = await safeJsonResponse(customerResponse);
    const orderData = await safeJsonResponse(orderResponse);
    
    if (!customerData || !orderData || !customerData.contact) {
      return null;
    }

    // Clean phone number
    let phoneNumber = customerData.contact.replace(/[\s-()]/g, '');
    if (!phoneNumber.startsWith('+')) {
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '+91' + phoneNumber.substring(1);
      } else if (!phoneNumber.startsWith('91')) {
        phoneNumber = '+91' + phoneNumber;
      } else if (phoneNumber.startsWith('91')) {
        phoneNumber = '+' + phoneNumber;
      }
    }

    // Create message with specific order details
    let message = `*BISMI CHICKEN SHOP*\n\nHello ${customerData.name},`;
    
    // Add current pending amount
    if (customerData.pendingAmount && customerData.pendingAmount > 0) {
      message += `\n\n*Current Pending Amount: ₹${customerData.pendingAmount.toFixed(2)}*`;
    }
    
    // Add specific order details
    message += `\n\n*Order Details:*`;
    const orderDate = new Date(orderData.createdAt);
    message += `\n📅 Date: ${orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    message += `\n💰 Amount: ₹${(orderData.totalAmount || 0).toFixed(2)}`;
    message += `\n📦 Status: ${orderData.paymentStatus === 'paid' ? 'Paid' : 'Pending'}`;
    
    // Add order items
    if (orderData.items && orderData.items.length > 0) {
      message += `\n\n*Items Purchased:*`;
      orderData.items.forEach((item: any) => {
        const itemDetails = item.details ? ` - ${item.details}` : '';
        message += `\n• ${(item.quantity || 0).toFixed(2)} kg ${item.type}${itemDetails}`;
        message += `\n  Rate: ₹${(item.rate || 0).toFixed(2)}/kg`;
      });
    }
    
    message += `\n\nThank you for your business with us.`;
    message += `\n\nFor any queries, please contact us.`;
    
    const whatsappUrl = `https://wa.me/${phoneNumber.replace('+', '')}?text=${encodeURIComponent(message)}`;
    
    return whatsappUrl;
  } catch (error) {
    console.error("Error creating order WhatsApp message:", error);
    return null;
  }
}