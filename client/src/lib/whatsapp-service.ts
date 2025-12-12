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
      message += `\n💰 Total Amount: ₹${(latestOrder.totalAmount || 0).toFixed(2)}`;
      
      // Enhanced payment status display for recent orders
      const paidAmount = latestOrder.paidAmount || 0;
      const totalAmount = latestOrder.totalAmount || 0;
      const remainingAmount = totalAmount - paidAmount;
      
      if (latestOrder.paymentStatus === 'paid') {
        message += `\n✅ Payment Status: Fully Paid`;
      } else if (latestOrder.paymentStatus === 'partially_paid') {
        message += `\n🟡 Payment Status: Partially Paid`;
        message += `\n💵 Paid: ₹${paidAmount.toFixed(2)} | Remaining: ₹${remainingAmount.toFixed(2)}`;
      } else {
        message += `\n🔴 Payment Status: Pending Payment`;
        message += `\n💸 Full Amount Due: ₹${totalAmount.toFixed(2)}`;
      }
      
      if (latestOrder.items && latestOrder.items.length > 0) {
        message += `\n\n*Order Items*`;
        message += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        
        let calculatedTotal = 0;
        latestOrder.items.forEach((item: any) => {
          const quantity = (item.quantity || 0);
          const rate = (item.rate || 0);
          const itemTotal = quantity * rate;
          calculatedTotal += itemTotal;
          
          const itemName = (item.type || '').charAt(0).toUpperCase() + (item.type || '').slice(1);
          
          message += `\n\n🔸 *${itemName}*`;
          message += `\n   Quantity: ${quantity.toFixed(2)} kg`;
          message += `\n   Rate: ₹${rate.toFixed(2)} per kg`;
          message += `\n   Amount: ₹${itemTotal.toFixed(1)}`;
        });
        
        message += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        message += `\n💰 *Total: ₹${calculatedTotal.toFixed(0)}*`;
      }
    }
    
    // Add appropriate closing message with enhanced payment reminders
    if (customerData.pendingAmount && customerData.pendingAmount > 0) {
      message += `\n\n*Payment Reminder:*`;
      message += `\nKindly settle your pending amount of ₹${customerData.pendingAmount.toFixed(2)} at your earliest convenience.`;
      message += `\n\nYou can make partial payments as well. Every payment helps!`;
    } else {
      message += `\n\nThank you for your business with us! Your account is up to date.`;
    }
    
    message += `\n\n📞 For any queries or to make a payment, please contact us.`;
    message += `\n\n*BISMI CHICKEN SHOP*\n_Fresh Quality, Every Day_`;
    
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
    
    // Add specific order details with enhanced payment information
    message += `\n\n*Order Details:*`;
    const orderDate = new Date(orderData.createdAt);
    message += `\n📅 Date: ${orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    message += `\n💰 Total Amount: ₹${(orderData.totalAmount || 0).toFixed(2)}`;
    
    // Enhanced payment status display with partial payment details
    const paidAmount = orderData.paidAmount || 0;
    const totalAmount = orderData.totalAmount || 0;
    const remainingAmount = totalAmount - paidAmount;
    
    if (orderData.paymentStatus === 'paid') {
      message += `\n✅ Payment Status: Fully Paid`;
    } else if (orderData.paymentStatus === 'partially_paid') {
      message += `\n🟡 Payment Status: Partially Paid`;
      message += `\n💵 Paid: ₹${paidAmount.toFixed(2)} | Remaining: ₹${remainingAmount.toFixed(2)}`;
    } else {
      message += `\n🔴 Payment Status: Pending`;
      message += `\n💸 Amount Due: ₹${totalAmount.toFixed(2)}`;
    }
    
    // Add order items in mobile-friendly format
    if (orderData.items && orderData.items.length > 0) {
      message += `\n\n*Order Items*`;
      message += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      
      let calculatedTotal = 0;
      orderData.items.forEach((item: any) => {
        const quantity = (item.quantity || 0);
        const rate = (item.rate || 0);
        const itemTotal = quantity * rate;
        calculatedTotal += itemTotal;
        
        const itemName = (item.type || '').charAt(0).toUpperCase() + (item.type || '').slice(1);
        
        message += `\n\n🔸 *${itemName}*`;
        message += `\n   Quantity: ${quantity.toFixed(2)} kg`;
        message += `\n   Rate: ₹${rate.toFixed(2)} per kg`;
        message += `\n   Amount: ₹${itemTotal.toFixed(1)}`;
      });
      
      message += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      message += `\n💰 *Total: ₹${calculatedTotal.toFixed(0)}*`;
    }
    
    // Enhanced closing message for order-specific WhatsApp
    if (orderData.paymentStatus === 'partially_paid') {
      const remainingAmount = (orderData.totalAmount || 0) - (orderData.paidAmount || 0);
      message += `\n\n*Payment Reminder:*`;
      message += `\nRemaining balance for this order: ₹${remainingAmount.toFixed(2)}`;
      message += `\nYou can make payment at your convenience.`;
    } else if (orderData.paymentStatus === 'pending') {
      message += `\n\n*Payment Reminder:*`;
      message += `\nTotal amount of ₹${totalAmount.toFixed(2)} is pending for this order.`;
      message += `\nKindly settle the payment when convenient. You can also make partial payments if preferred.`;
    } else {
      message += `\n\nThank you for your prompt payment!`;
    }
    
    message += `\n\n📞 For any queries or to make a payment, please contact us.`;
    message += `\n\n*BISMI CHICKEN SHOP*\n_Fresh Quality, Every Day_`;
    
    const whatsappUrl = `https://wa.me/${phoneNumber.replace('+', '')}?text=${encodeURIComponent(message)}`;
    
    return whatsappUrl;
  } catch (error) {
    console.error("Error creating order WhatsApp message:", error);
    return null;
  }
}