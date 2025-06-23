import { IStorage } from '../storage';
import { MoneyUtils } from '../../shared/money-utils';

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
      
      // CRITICAL BUG FIX: Check if orders array is empty or malformed
      if (!orders || orders.length === 0) {
        console.log(`No orders found for customer ${customerId} - returning 0 pending amount`);
        return 0;
      }
      
      const unpaidOrders = orders.filter(order => order.paymentStatus !== 'paid');
      console.log(`Unpaid orders: ${unpaidOrders.length}`);
      
      let totalPending = 0;
      for (const order of unpaidOrders) {
        const totalAmount = Math.max(0, order.totalAmount || 0);
        const paidAmount = Math.max(0, order.paidAmount || 0);
        const orderBalance = Math.max(0, totalAmount - paidAmount);
        
        console.log(`Order ${order.id}: Total=₹${totalAmount}, Paid=₹${paidAmount}, Balance=₹${orderBalance}, Status=${order.paymentStatus}`);
        
        // Validate order data
        if (totalAmount <= 0) {
          console.warn(`Order ${order.id} has invalid totalAmount: ${order.totalAmount}`);
          continue;
        }
        
        totalPending += orderBalance;
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
        .filter(t => t.type === 'supplier_payment')
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
   * Ensures database consistency with improved data integrity checks
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
      
      // Enhanced data integrity validation
      const orders = await this.storage.getOrdersByCustomer(customerId);
      const unpaidOrders = orders.filter(o => o.paymentStatus !== 'paid');
      
      // Validate order data integrity
      let hasCorruptedOrders = false;
      for (const order of unpaidOrders) {
        if (!order.totalAmount || order.totalAmount <= 0 || 
            (order.paidAmount && order.paidAmount < 0)) {
          console.error(`Corrupted order detected: ${order.id}`, {
            totalAmount: order.totalAmount,
            paidAmount: order.paidAmount,
            paymentStatus: order.paymentStatus
          });
          hasCorruptedOrders = true;
        }
      }
      
      if (hasCorruptedOrders) {
        console.error(`Data corruption detected - manual intervention required for customer ${customerId}`);
        // Don't update pending amount if data is corrupted
        return currentStoredAmount;
      }
      
      // Precision handling using money utilities
      const roundedCalculatedAmount = MoneyUtils.round(calculatedAmount);
      
      await this.storage.updateCustomer(customerId, { pendingAmount: roundedCalculatedAmount });
      console.log(`Updated customer pending amount to: ₹${roundedCalculatedAmount}`);
      console.log(`--- SYNC PENDING AMOUNT END ---\n`);
      
      return roundedCalculatedAmount;
    } catch (error) {
      console.error(`Error syncing pending amount for customer ${customerId}:`, error);
      // Return current stored amount on error to prevent data loss
      const customer = await this.storage.getCustomer(customerId);
      return customer?.pendingAmount || 0;
    }
  }

  /**
   * Sync supplier's stored pending amount with calculated amount
   * Ensures database consistency with enhanced error handling
   */
  async syncSupplierPendingAmount(supplierId: string): Promise<number> {
    try {
      console.log(`\n--- SUPPLIER SYNC PENDING AMOUNT START ---`);
      
      // Get current stored amount
      const supplier = await this.storage.getSupplier(supplierId);
      const currentStoredAmount = supplier?.pendingAmount || 0;
      console.log(`Current stored pending amount: ₹${currentStoredAmount}`);
      
      const calculatedAmount = await this.calculateSupplierPendingAmount(supplierId);
      console.log(`Calculated pending amount: ₹${calculatedAmount}`);
      
      // Precision handling using money utilities
      const roundedCalculatedAmount = MoneyUtils.round(calculatedAmount);
      
      await this.storage.updateSupplier(supplierId, { pendingAmount: roundedCalculatedAmount });
      console.log(`Updated supplier pending amount to: ₹${roundedCalculatedAmount}`);
      console.log(`--- SUPPLIER SYNC PENDING AMOUNT END ---\n`);
      
      return roundedCalculatedAmount;
    } catch (error) {
      console.error(`Error syncing pending amount for supplier ${supplierId}:`, error);
      // Return current stored amount on error to prevent data loss
      const supplier = await this.storage.getSupplier(supplierId);
      return supplier?.pendingAmount || 0;
    }
  }

  /**
   * Process customer payment with atomic transaction handling
   * Handles partial payments, overpayments, and multi-order payments with data integrity
   */
  async processCustomerPayment(customerId: string, paymentAmount: number, description?: string, targetOrderId?: string): Promise<{
    appliedAmount: number;
    remainingCredit: number;
    updatedOrders: string[];
  }> {
    // Validate payment amount using money utilities
    const validation = MoneyUtils.validatePayment(paymentAmount);
    if (!validation.isValid) {
      throw new Error(`Invalid payment amount: ${validation.error}`);
    }
    const sanitizedPayment = MoneyUtils.round(paymentAmount);

    let transactionCreated = false;
    const orderUpdates: Array<{orderId: string, originalPaidAmount: number, originalStatus: string}> = [];
    
    try {
      console.log(`\n=== PAYMENT PROCESSING START ===`);
      console.log(`Customer: ${customerId}, Payment: ₹${sanitizedPayment}`);
      
      // Verify customer exists
      const customerBefore = await this.storage.getCustomer(customerId);
      if (!customerBefore) {
        throw new Error(`Customer ${customerId} not found`);
      }
      console.log(`Customer pending before payment: ₹${customerBefore.pendingAmount || 0}`);
      
      // Get and validate orders
      const orders = await this.storage.getOrdersByCustomer(customerId);
      console.log(`Found ${orders.length} orders for customer`);
      
      // Data integrity check on orders
      for (const order of orders) {
        if (!order.totalAmount || order.totalAmount <= 0) {
          throw new Error(`Order ${order.id} has invalid totalAmount: ${order.totalAmount}`);
        }
        if (order.paidAmount && order.paidAmount < 0) {
          throw new Error(`Order ${order.id} has negative paidAmount: ${order.paidAmount}`);
        }
      }
      
      let ordersToProcess;
      if (targetOrderId) {
        ordersToProcess = orders.filter(order => order.id === targetOrderId && order.paymentStatus !== 'paid');
        if (ordersToProcess.length === 0) {
          throw new Error(`Target order ${targetOrderId} not found or already paid`);
        }
      } else {
        ordersToProcess = orders
          .filter(order => order.paymentStatus !== 'paid')
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }

      let remainingPayment = sanitizedPayment;
      let appliedAmount = 0;
      const updatedOrders: string[] = [];

      // Process payment with rollback capability
      for (const order of ordersToProcess) {
        if (remainingPayment <= 0) break;

        const currentPaid = MoneyUtils.round(order.paidAmount || 0);
        const totalAmount = MoneyUtils.round(order.totalAmount);
        const remainingBalance = MoneyUtils.subtract(totalAmount, currentPaid);
        
        console.log(`Processing order ${order.id}: currentPaid=₹${currentPaid}, totalAmount=₹${totalAmount}, remainingBalance=₹${remainingBalance}`);
        
        if (remainingBalance <= 0) {
          console.log(`Skipping order ${order.id} - already fully paid`);
          continue;
        }

        // Store original values for potential rollback
        orderUpdates.push({
          orderId: order.id,
          originalPaidAmount: currentPaid,
          originalStatus: order.paymentStatus
        });

        if (remainingPayment >= remainingBalance) {
          // Full payment for remaining balance
          const newPaidAmount = totalAmount;
          console.log(`Full payment for order ${order.id}: setting paidAmount to ₹${newPaidAmount}`);
          await this.storage.updateOrder(order.id, { 
            paidAmount: newPaidAmount,
            paymentStatus: 'paid' 
          });
          remainingPayment = MoneyUtils.subtract(remainingPayment, remainingBalance);
          appliedAmount = MoneyUtils.add(appliedAmount, remainingBalance);
          updatedOrders.push(order.id);
        } else {
          // Partial payment
          const newPaidAmount = MoneyUtils.add(currentPaid, remainingPayment);
          console.log(`Partial payment for order ${order.id}: setting paidAmount to ₹${newPaidAmount}`);
          await this.storage.updateOrder(order.id, { 
            paidAmount: newPaidAmount,
            paymentStatus: 'partially_paid' 
          });
          appliedAmount = MoneyUtils.add(appliedAmount, remainingPayment);
          remainingPayment = 0;
          updatedOrders.push(order.id);
        }
      }

      // Create transaction record (after successful order updates)
      await this.storage.createTransaction({
        entityId: customerId,
        entityType: 'customer',
        type: 'customer_payment',
        amount: sanitizedPayment,
        description: description || `Payment from customer${targetOrderId ? ` for order #${targetOrderId}` : ''}`
      });
      transactionCreated = true;

      // Sync the customer's pending amount
      const newPendingAmount = await this.syncCustomerPendingAmount(customerId);
      console.log(`Payment processed successfully - Applied: ₹${appliedAmount}, Remaining: ₹${remainingPayment}`);
      console.log(`=== PAYMENT PROCESSING END ===\n`);

      return {
        appliedAmount,
        remainingCredit: remainingPayment,
        updatedOrders
      };
    } catch (error) {
      console.error(`Error processing payment for customer ${customerId}:`, error);
      
      // Rollback order updates if they were made
      if (orderUpdates.length > 0) {
        console.log(`Rolling back ${orderUpdates.length} order updates`);
        for (const update of orderUpdates) {
          try {
            await this.storage.updateOrder(update.orderId, {
              paidAmount: update.originalPaidAmount,
              paymentStatus: update.originalStatus
            });
          } catch (rollbackError) {
            console.error(`Failed to rollback order ${update.orderId}:`, rollbackError);
          }
        }
      }
      
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