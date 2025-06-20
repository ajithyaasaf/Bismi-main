import { IStorage } from '../storage';

/**
 * Mathematical utility for accurate pending amount calculations
 * Ensures consistency across orders, payments, and customer records
 */
export class PendingAmountCalculator {
  constructor(private storage: IStorage) {}

  /**
   * Calculate customer's actual pending amount from their orders
   * Formula: Sum of all orders where paymentStatus === 'pending'
   */
  async calculateCustomerPendingAmount(customerId: string): Promise<number> {
    try {
      const orders = await this.storage.getOrdersByCustomer(customerId);
      
      const pendingAmount = orders
        .filter(order => order.paymentStatus === 'pending')
        .reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      
      return Math.max(0, pendingAmount); // No negative pending amounts
    } catch (error) {
      console.error(`Error calculating pending amount for customer ${customerId}:`, error);
      return 0;
    }
  }

  /**
   * Calculate supplier's actual pending amount from stored debt and transactions
   * Formula: Current stored debt + purchases - payments
   */
  async calculateSupplierPendingAmount(supplierId: string): Promise<number> {
    try {
      // Get supplier's current stored debt
      const supplier = await this.storage.getSupplier(supplierId);
      if (!supplier) return 0;
      
      // Get all transactions for this supplier
      const transactions = await this.storage.getTransactionsByEntity(supplierId);
      
      // Calculate total purchases (increases debt)
      const purchases = transactions
        .filter(t => t.type === 'expense' || t.type === 'purchase')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      // Calculate total payments (reduces debt)
      const payments = transactions
        .filter(t => t.type === 'payment')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      // Start with original debt amount, add purchases, subtract payments
      const finalAmount = (supplier.pendingAmount || 0) + purchases - payments;
      
      console.log(`Supplier ${supplierId} debt calculation:`, {
        originalDebt: supplier.pendingAmount || 0,
        purchases,
        payments,
        finalAmount: Math.max(0, finalAmount)
      });
      
      return Math.max(0, finalAmount);
    } catch (error) {
      console.error(`Error calculating pending amount for supplier ${supplierId}:`, error);
      return 0;
    }
  }

  /**
   * Sync customer's stored pending amount with calculated amount
   * Ensures database consistency
   */
  async syncCustomerPendingAmount(customerId: string): Promise<number> {
    try {
      const calculatedAmount = await this.calculateCustomerPendingAmount(customerId);
      await this.storage.updateCustomer(customerId, { pendingAmount: calculatedAmount });
      return calculatedAmount;
    } catch (error) {
      console.error(`Error syncing pending amount for customer ${customerId}:`, error);
      return 0;
    }
  }

  /**
   * Sync supplier's stored pending amount with calculated amount
   * Ensures database consistency
   */
  async syncSupplierPendingAmount(supplierId: string): Promise<number> {
    try {
      const calculatedAmount = await this.calculateSupplierPendingAmount(supplierId);
      await this.storage.updateSupplier(supplierId, { pendingAmount: calculatedAmount });
      return calculatedAmount;
    } catch (error) {
      console.error(`Error syncing pending amount for supplier ${supplierId}:`, error);
      return 0;
    }
  }

  /**
   * Process customer payment with proper order status updates
   * Handles partial payments, overpayments, and multi-order payments
   */
  async processCustomerPayment(customerId: string, paymentAmount: number, description?: string): Promise<{
    appliedAmount: number;
    remainingCredit: number;
    updatedOrders: string[];
  }> {
    try {
      // Get all pending orders for the customer
      const orders = await this.storage.getOrdersByCustomer(customerId);
      const pendingOrders = orders
        .filter(order => order.paymentStatus === 'pending')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); // Pay oldest first

      let remainingPayment = paymentAmount;
      let appliedAmount = 0;
      const updatedOrders: string[] = [];

      // Apply payment to orders (oldest first)
      for (const order of pendingOrders) {
        if (remainingPayment <= 0) break;

        const orderAmount = order.totalAmount || 0;
        
        if (remainingPayment >= orderAmount) {
          // Full payment for this order
          await this.storage.updateOrder(order.id, { paymentStatus: 'paid' });
          remainingPayment -= orderAmount;
          appliedAmount += orderAmount;
          updatedOrders.push(order.id);
        } else {
          // Partial payment - keep order as pending but record partial payment
          // Note: This could be enhanced with partial payment tracking if needed
          appliedAmount += remainingPayment;
          remainingPayment = 0;
        }
      }

      // Create transaction record
      await this.storage.createTransaction({
        entityId: customerId,
        entityType: 'customer',
        type: 'payment',
        amount: paymentAmount,
        description: description || `Payment from customer`
      });

      // Sync the customer's pending amount
      await this.syncCustomerPendingAmount(customerId);

      return {
        appliedAmount,
        remainingCredit: remainingPayment,
        updatedOrders
      };
    } catch (error) {
      console.error(`Error processing payment for customer ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Get real-time customer data for WhatsApp with accurate pending amount
   */
  async getCustomerForWhatsApp(customerId: string): Promise<any> {
    try {
      const customer = await this.storage.getCustomer(customerId);
      if (!customer) return null;

      // Calculate real-time pending amount
      const realTimePendingAmount = await this.calculateCustomerPendingAmount(customerId);
      
      // Get recent orders for WhatsApp message
      const orders = await this.storage.getOrdersByCustomer(customerId);
      const recentOrders = orders
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5); // Last 5 orders

      return {
        ...customer,
        pendingAmount: realTimePendingAmount, // Use calculated amount, not stored amount
        recentOrders
      };
    } catch (error) {
      console.error(`Error getting customer data for WhatsApp ${customerId}:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const createPendingCalculator = (storage: IStorage) => new PendingAmountCalculator(storage);