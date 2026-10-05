import { IStorage } from '../storage.js';
import {
  roundCurrency,
  calculateOrderBalance,
  determinePaymentStatus
} from '../../shared/currency-utils.js';

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
      // 1. Calculate unpaid order balances
      const orders = await this.storage.getOrdersByCustomer(customerId);
      const unpaidOrders = (orders || []).filter(order => order.paymentStatus !== 'paid');

      let ordersPending = 0;
      for (const order of unpaidOrders) {
        const totalAmount = roundCurrency(order.totalAmount || 0);
        const paidAmount = roundCurrency(order.paidAmount || 0);
        const orderBalance = calculateOrderBalance(totalAmount, paidAmount);

        if (totalAmount <= 0) continue;
        ordersPending = roundCurrency(ordersPending + orderBalance);
      }

      // 2. Calculate debt adjustments (charges add debt, credits reduce debt)
      const adjustments = await this.storage.getDebtAdjustmentsByCustomer(customerId);
      const adjustmentBalance = (adjustments || []).reduce((sum, adj) => {
        const amt = roundCurrency(adj.amount || 0);
        return adj.type === 'debit' ? roundCurrency(sum + amt) : roundCurrency(sum - amt);
      }, 0);

      // 3. Calculate initial debt and unallocated credits
      const transactions = await this.storage.getTransactionsByEntity(customerId);
      const initialDebtTx = (transactions || []).find(t => t.type === 'initial_debt');
      let initialDebt = 0;

      if (initialDebtTx) {
        initialDebt = roundCurrency(initialDebtTx.amount || 0);
      } else if ((!transactions || transactions.length === 0) && (!orders || orders.length === 0)) {
        // Customer created with opening pendingAmount but no orders or transactions yet
        const customer = await this.storage.getCustomer(customerId);
        initialDebt = roundCurrency(customer?.pendingAmount || 0);
      }

      // Check if any payment transactions were unallocated to orders
      const totalPayments = (transactions || [])
        .filter(t => t.type === 'payment')
        .reduce((sum, t) => roundCurrency(sum + (t.amount || 0)), 0);

      const orderPayments = (orders || []).reduce(
        (sum, o) => roundCurrency(sum + (o.paidAmount || 0)),
        0
      );

      const unallocatedPayments = Math.max(0, roundCurrency(totalPayments - orderPayments));
      const remainingInitialDebt = Math.max(0, roundCurrency(initialDebt - unallocatedPayments));

      const totalPending = roundCurrency(ordersPending + adjustmentBalance + remainingInitialDebt);

      console.log(`[CUSTOMER PENDING CALC] Customer ${customerId}: OrdersPending=₹${ordersPending}, Adjustments=₹${adjustmentBalance}, RemainingInitialDebt=₹${remainingInitialDebt} -> Total=₹${totalPending}`);

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
      console.log(`\n--- SYNC CUSTOMER PENDING AMOUNT START (${customerId}) ---`);

      const customer = await this.storage.getCustomer(customerId);
      const currentStoredAmount = customer?.pendingAmount || 0;

      const calculatedAmount = await this.calculateCustomerPendingAmount(customerId);
      console.log(`Customer ${customerId} - Current stored: ₹${currentStoredAmount}, Calculated: ₹${calculatedAmount}`);

      await this.storage.updateCustomer(customerId, { pendingAmount: calculatedAmount });
      console.log(`--- SYNC CUSTOMER PENDING AMOUNT END ---\n`);

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
        // Payment for specific order - match ID flexibly
        ordersToProcess = orders.filter(order => String(order.id).trim() === String(targetOrderId).trim() && order.paymentStatus !== 'paid');
        if (ordersToProcess.length === 0) {
          // Direct fallback if not returned in customer filter
          const directOrder = await this.storage.getOrder(targetOrderId);
          if (directOrder && directOrder.paymentStatus !== 'paid') {
            ordersToProcess = [directOrder];
          }
        }
      } else {
        // General payment - apply to unpaid orders (oldest first)
        ordersToProcess = orders
          .filter(order => order.paymentStatus !== 'paid')
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }

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
   * Process multiple smart payment allocations in a single atomic flow
   */
  async processMultipleCustomerPayments(
    customerId: string,
    payments: Array<{ orderId: string; amount: number; description?: string }>
  ): Promise<{
    appliedAmount: number;
    updatedOrders: string[];
  }> {
    try {
      console.log(`\n=== MULTIPLE PAYMENTS PROCESSING START ===`);
      console.log(`Customer: ${customerId}, Allocations count: ${payments.length}`);

      const customer = await this.storage.getCustomer(customerId);
      if (!customer) {
        throw new Error(`Customer ${customerId} not found`);
      }

      const orders = await this.storage.getOrdersByCustomer(customerId);
      let totalApplied = 0;
      const updatedOrders: string[] = [];

      for (const payment of payments) {
        const allocAmount = roundCurrency(parseFloat(String(payment.amount)) || 0);
        if (allocAmount <= 0) continue;

        // Find the target order
        let order = orders.find(o => String(o.id).trim() === String(payment.orderId).trim());
        if (!order) {
          order = await this.storage.getOrder(payment.orderId);
        }

        if (order) {
          const currentPaid = roundCurrency(order.paidAmount || 0);
          const totalAmount = roundCurrency(order.totalAmount || 0);
          const newPaid = Math.min(totalAmount, roundCurrency(currentPaid + allocAmount));
          const newStatus = determinePaymentStatus(totalAmount, newPaid);

          await this.storage.updateOrder(order.id, {
            paidAmount: newPaid,
            paymentStatus: newStatus
          });

          // Update local in-memory order object
          order.paidAmount = newPaid;
          order.paymentStatus = newStatus;

          totalApplied = roundCurrency(totalApplied + allocAmount);
          updatedOrders.push(order.id);
        }

        // Create individual transaction record for audit trail
        await this.storage.createTransaction({
          entityId: customerId,
          entityType: 'customer',
          type: 'payment',
          amount: allocAmount,
          description: payment.description || `Payment for order #${payment.orderId.substring(0, 8)}`
        });
      }

      // Sync customer pending amount once after all allocations are applied
      const newPending = await this.syncCustomerPendingAmount(customerId);
      console.log(`Customer ${customerId} final pending amount after allocations: ₹${newPending}`);
      console.log(`=== MULTIPLE PAYMENTS PROCESSING END ===\n`);

      return {
        appliedAmount: totalApplied,
        updatedOrders
      };
    } catch (error) {
      console.error(`Error processing multiple payments for customer ${customerId}:`, error);
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