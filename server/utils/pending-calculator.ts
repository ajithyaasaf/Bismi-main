import { IStorage } from '../storage.js';

/**
 * Mathematical utility for accurate pending amount calculations
 * Ensures consistency across orders, payments, and customer records
 */
export class PendingAmountCalculator {
  constructor(private storage: IStorage) { }

  /**
   * Calculate customer's actual pending amount from their orders
   * Formula: Sum of (totalAmount - paidAmount) for all non-fully-paid orders
   * Uses precise currency calculations to prevent floating point errors
   */
  async calculateCustomerPendingAmount(customerId: string): Promise<number> {
    try {
      // Import currency utilities for precise calculations
      const { roundCurrency, calculateOrderBalance } = await import('@shared/currency-utils');

      const orders = await this.storage.getOrdersByCustomer(customerId);
      console.log(`Calculate pending - Found ${orders.length} orders for customer ${customerId}`);

      // CRITICAL BUG FIX: Check if orders array is empty or malformed
      if (!orders || orders.length === 0) {
        console.log(`No orders found for customer ${customerId} - returning 0 pending amount`);
        return 0;
      }

      const unpaidOrders = orders.filter(order => order.paymentStatus !== 'paid');
      console.log(`Unpaid orders: ${unpaidOrders.length}`);

      let totalPending = 0;
      for (const order of unpaidOrders) {
        const totalAmount = roundCurrency(order.totalAmount || 0);
        const paidAmount = roundCurrency(order.paidAmount || 0);
        const orderBalance = calculateOrderBalance(totalAmount, paidAmount);

        console.log(`Order ${order.id}: Total=₹${totalAmount}, Paid=₹${paidAmount}, Balance=₹${orderBalance}, Status=${order.paymentStatus}`);

        // Validate order data
        if (totalAmount <= 0) {
          console.warn(`Order ${order.id} has invalid totalAmount: ${order.totalAmount}`);
          continue;
        }

        // Enhanced validation for payment status consistency
        if (order.paymentStatus === 'paid' && orderBalance > 0.01) {
          console.warn(`Order ${order.id} marked as paid but has balance ₹${orderBalance}`);
        }

        if (order.paymentStatus === 'pending' && paidAmount > 0.01) {
          console.warn(`Order ${order.id} marked as pending but has paid amount ₹${paidAmount}`);
        }

        totalPending = roundCurrency(totalPending + orderBalance);
      }

      console.log(`Total calculated pending amount: ₹${totalPending}`);
      return Math.max(0, totalPending);
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

      // Get current stored amount before calculation
      const customer = await this.storage.getCustomer(customerId);
      const currentStoredAmount = customer?.pendingAmount || 0;
      console.log(`Current stored pending amount: ₹${currentStoredAmount}`);

      const calculatedAmount = await this.calculateCustomerPendingAmount(customerId);
      console.log(`Calculated pending amount: ₹${calculatedAmount}`);

      // CRITICAL BUG FIX: Prevent erroneous zero amounts
      if (currentStoredAmount > 0 && calculatedAmount === 0) {
        const orders = await this.storage.getOrdersByCustomer(customerId);
        console.log(`WARNING: Calculated amount is 0 but stored amount was ₹${currentStoredAmount}`);
        console.log(`Customer has ${orders.length} orders total`);

        // If there are no orders but customer had pending amount, preserve it
        if (orders.length === 0) {
          console.log(`No orders found - preserving stored pending amount of ₹${currentStoredAmount}`);
          return currentStoredAmount;
        }

        // If orders exist but calculation shows 0, investigate further
        const unpaidOrders = orders.filter(o => o.paymentStatus !== 'paid');
        console.log(`Found ${unpaidOrders.length} unpaid orders`);

        if (unpaidOrders.length > 0) {
          console.log(`ERROR: Orders exist but calculation shows 0 - this indicates a data inconsistency`);
          console.log(`Preserving stored amount of ₹${currentStoredAmount} to prevent data loss`);
          return currentStoredAmount;
        }
      }

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

      // Import currency utilities for precise calculations
      const { roundCurrency, calculateOrderBalance, determinePaymentStatus } = await import('@shared/currency-utils');

      let remainingPayment = roundCurrency(paymentAmount);
      let appliedAmount = 0;
      const updatedOrders: string[] = [];

      // Apply payment to orders with precise calculations
      for (const order of ordersToProcess) {
        if (remainingPayment <= 0) break;

        const currentPaid = roundCurrency(order.paidAmount || 0);
        const totalAmount = roundCurrency(order.totalAmount || 0);
        const remainingBalance = calculateOrderBalance(totalAmount, currentPaid);

        console.log(`Processing order ${order.id}: currentPaid=₹${currentPaid}, totalAmount=₹${totalAmount}, remainingBalance=₹${remainingBalance}, paymentLeft=₹${remainingPayment}`);

        if (remainingBalance <= 0) {
          console.log(`Skipping order ${order.id} - already fully paid`);
          continue; // Skip fully paid orders
        }

        if (remainingPayment >= remainingBalance) {
          // Full payment for remaining balance
          const newPaidAmount = totalAmount;
          const finalPaymentStatus = determinePaymentStatus(totalAmount, newPaidAmount);

          console.log(`Full payment for order ${order.id}: setting paidAmount to ₹${newPaidAmount}, status: ${finalPaymentStatus}`);

          await this.storage.updateOrder(order.id, {
            paidAmount: newPaidAmount,
            paymentStatus: finalPaymentStatus
          });

          remainingPayment = roundCurrency(remainingPayment - remainingBalance);
          appliedAmount = roundCurrency(appliedAmount + remainingBalance);
          updatedOrders.push(order.id);
        } else {
          // Partial payment - update paidAmount and set status to partially_paid
          const newPaidAmount = roundCurrency(currentPaid + remainingPayment);
          const finalPaymentStatus = determinePaymentStatus(totalAmount, newPaidAmount);

          console.log(`Partial payment for order ${order.id}: setting paidAmount to ₹${newPaidAmount}, status: ${finalPaymentStatus}`);

          await this.storage.updateOrder(order.id, {
            paidAmount: newPaidAmount,
            paymentStatus: finalPaymentStatus
          });

          appliedAmount = roundCurrency(appliedAmount + remainingPayment);
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