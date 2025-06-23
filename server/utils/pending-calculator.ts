import { IStorage } from '../storage';

/**
 * Mathematical utility for accurate pending amount calculations
 * Ensures consistency across orders, payments, and customer records
 */
export class PendingAmountCalculator {
  constructor(private storage: IStorage) {}

  /**
   * Calculate customer's actual pending amount from their orders
   * Formula: Sum of (totalAmount - paidAmount) for all non-fully-paid orders
   */
  async calculateCustomerPendingAmount(customerId: string): Promise<number> {
    try {
      const orders = await this.storage.getOrdersByCustomer(customerId);
      console.log(`Calculate pending - Found ${orders.length} orders for customer ${customerId}`);
      
      const unpaidOrders = orders.filter(order => order.paymentStatus !== 'paid');
      console.log(`Unpaid orders: ${unpaidOrders.length}`);
      
      const pendingAmount = unpaidOrders.reduce((sum, order) => {
          const orderBalance = (order.totalAmount || 0) - (order.paidAmount || 0);
          console.log(`Order ${order.id}: Total=₹${order.totalAmount}, Paid=₹${order.paidAmount || 0}, Balance=₹${orderBalance}, Status=${order.paymentStatus}`);
          return sum + Math.max(0, orderBalance); // Ensure no negative order balances
        }, 0);
      
      console.log(`Total calculated pending amount: ₹${pendingAmount}`);
      return Math.max(0, pendingAmount); // No negative pending amounts
    } catch (error) {
      console.error(`Error calculating pending amount for customer ${customerId}:`, error);
      return 0;
    }
  }

  /**
   * Calculate supplier's actual pending amount from transactions only
   * Formula: Sum of all debt-increasing transactions - sum of all payments
   */
  async calculateSupplierPendingAmount(supplierId: string): Promise<number> {
    try {
      // Get all transactions for this supplier
      const transactions = await this.storage.getTransactionsByEntity(supplierId);
      
      // Calculate total debt increases (purchases, expenses, initial debt)
      const debtIncreases = transactions
        .filter(t => t.type === 'expense' || t.type === 'purchase' || t.type === 'initial_debt')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      // Calculate total payments (reduces debt)
      const payments = transactions
        .filter(t => t.type === 'payment')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      // If no initial_debt transaction exists but there are other transactions,
      // we need to account for the original debt amount
      const hasInitialDebt = transactions.some(t => t.type === 'initial_debt');
      let originalDebt = 0;
      
      if (!hasInitialDebt && transactions.length > 0) {
        // Get the original debt amount from the supplier record
        const supplier = await this.storage.getSupplier(supplierId);
        // Use the initial debt that was set when supplier was created
        // We need to reverse-calculate this: current + payments - purchases = original
        originalDebt = (supplier?.pendingAmount || 0) + payments - (debtIncreases);
        console.log(`Supplier ${supplierId} calculated original debt: ${originalDebt}`);
      }
      
      // If no transactions exist at all, use the stored pending amount
      if (transactions.length === 0) {
        const supplier = await this.storage.getSupplier(supplierId);
        const initialDebt = supplier?.pendingAmount || 0;
        
        console.log(`Supplier ${supplierId} debt calculation (no transactions):`, {
          initialDebt,
          finalAmount: Math.max(0, initialDebt)
        });
        
        return Math.max(0, initialDebt);
      }
      
      // Calculate based on transaction history + original debt if needed
      const finalAmount = (debtIncreases + originalDebt) - payments;
      
      console.log(`Supplier ${supplierId} debt calculation:`, {
        debtIncreases,
        payments,
        transactionCount: transactions.length,
        finalAmount: Math.max(0, finalAmount),
        transactions: transactions.map(t => ({ type: t.type, amount: t.amount, description: t.description }))
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
      console.log(`\n--- SYNC PENDING AMOUNT START ---`);
      const calculatedAmount = await this.calculateCustomerPendingAmount(customerId);
      console.log(`Calculated pending amount: ₹${calculatedAmount}`);
      
      await this.storage.updateCustomer(customerId, { pendingAmount: calculatedAmount });
      console.log(`Updated customer pending amount to: ₹${calculatedAmount}`);
      console.log(`--- SYNC PENDING AMOUNT END ---\n`);
      
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
   * Process customer payment with order-specific partial payment tracking
   * Handles partial payments, overpayments, and multi-order payments
   */
  async processCustomerPayment(customerId: string, paymentAmount: number, description?: string, targetOrderId?: string): Promise<{
    appliedAmount: number;
    remainingCredit: number;
    updatedOrders: string[];
  }> {
    try {
      console.log(`\n=== PAYMENT PROCESSING START ===`);
      console.log(`Customer: ${customerId}, Payment: ₹${paymentAmount}`);
      
      // Get customer's current state before payment
      const customerBefore = await this.storage.getCustomer(customerId);
      console.log(`Customer pending before payment: ₹${customerBefore?.pendingAmount || 0}`);
      
      // Get all orders for the customer
      const orders = await this.storage.getOrdersByCustomer(customerId);
      console.log(`Found ${orders.length} orders for customer`);
      orders.forEach(order => {
        console.log(`Order ${order.id}: Total=₹${order.totalAmount}, Paid=₹${order.paidAmount || 0}, Status=${order.paymentStatus}`);
      });
      
      let ordersToProcess;
      if (targetOrderId) {
        // Payment for specific order
        ordersToProcess = orders.filter(order => order.id === targetOrderId && order.paymentStatus !== 'paid');
      } else {
        // General payment - apply to unpaid orders (oldest first)
        ordersToProcess = orders
          .filter(order => order.paymentStatus !== 'paid')
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }

      let remainingPayment = paymentAmount;
      let appliedAmount = 0;
      const updatedOrders: string[] = [];

      // Apply payment to orders
      for (const order of ordersToProcess) {
        if (remainingPayment <= 0) break;

        const currentPaid = order.paidAmount || 0;
        const totalAmount = order.totalAmount || 0;
        const remainingBalance = totalAmount - currentPaid;
        
        if (remainingBalance <= 0) continue; // Skip fully paid orders

        if (remainingPayment >= remainingBalance) {
          // Full payment for remaining balance
          const newPaidAmount = totalAmount;
          await this.storage.updateOrder(order.id, { 
            paidAmount: newPaidAmount,
            paymentStatus: 'paid' 
          });
          remainingPayment -= remainingBalance;
          appliedAmount += remainingBalance;
          updatedOrders.push(order.id);
        } else {
          // Partial payment - update paidAmount and set status to partially_paid
          const newPaidAmount = currentPaid + remainingPayment;
          await this.storage.updateOrder(order.id, { 
            paidAmount: newPaidAmount,
            paymentStatus: 'partially_paid' 
          });
          appliedAmount += remainingPayment;
          remainingPayment = 0;
          updatedOrders.push(order.id);
        }
      }

      // Create transaction record
      await this.storage.createTransaction({
        entityId: customerId,
        entityType: 'customer',
        type: 'payment',
        amount: paymentAmount,
        description: description || `Payment from customer${targetOrderId ? ` for order #${targetOrderId}` : ''}`
      });

      // Sync the customer's pending amount
      console.log(`Before sync - Applied: ₹${appliedAmount}, Remaining: ₹${remainingPayment}`);
      const newPendingAmount = await this.syncCustomerPendingAmount(customerId);
      console.log(`After sync - Customer pending amount: ₹${newPendingAmount}`);
      console.log(`=== PAYMENT PROCESSING END ===\n`);

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

      // Use the stored pending amount instead of real-time calculation
      // to match what user sees on the customer page
      const displayPendingAmount = customer.pendingAmount || 0;
      
      // Get recent orders for WhatsApp message
      const orders = await this.storage.getOrdersByCustomer(customerId);
      const recentOrders = orders
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5); // Last 5 orders

      return {
        ...customer,
        pendingAmount: displayPendingAmount, // Use stored amount to match UI display
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