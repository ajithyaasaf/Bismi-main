import { IStorage } from '../storage';
import { MoneyUtils } from '../../shared/money-utils';

/**
 * Data repair utilities for fixing corrupted financial records
 * Ensures data integrity across orders, payments, and pending amounts
 */
export class DataRepairService {
  constructor(private storage: IStorage) {}

  /**
   * Repair corrupted order data
   */
  async repairOrder(orderId: string): Promise<{
    wasCorrupted: boolean;
    repairs: string[];
    order: any;
  }> {
    const repairs: string[] = [];
    let wasCorrupted = false;

    try {
      const order = await this.storage.getOrder(orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      let updates: any = {};

      // Fix invalid totalAmount
      if (!order.totalAmount || order.totalAmount <= 0) {
        // Try to recalculate from items
        if (order.items && order.items.length > 0) {
          const calculatedTotal = order.items.reduce((sum: number, item: any) => {
            const itemTotal = (item.quantity || 0) * (item.rate || 0);
            return MoneyUtils.add(sum, itemTotal);
          }, 0);
          
          if (calculatedTotal > 0) {
            updates.totalAmount = calculatedTotal;
            repairs.push(`Fixed totalAmount: ${order.totalAmount} → ${calculatedTotal}`);
            wasCorrupted = true;
          }
        }
      }

      // Fix negative paidAmount
      if (order.paidAmount && order.paidAmount < 0) {
        updates.paidAmount = 0;
        repairs.push(`Fixed negative paidAmount: ${order.paidAmount} → 0`);
        wasCorrupted = true;
      }

      // Fix precision issues
      if (order.totalAmount) {
        const roundedTotal = MoneyUtils.round(order.totalAmount);
        if (roundedTotal !== order.totalAmount) {
          updates.totalAmount = roundedTotal;
          repairs.push(`Fixed totalAmount precision: ${order.totalAmount} → ${roundedTotal}`);
          wasCorrupted = true;
        }
      }

      if (order.paidAmount) {
        const roundedPaid = MoneyUtils.round(order.paidAmount);
        if (roundedPaid !== order.paidAmount) {
          updates.paidAmount = roundedPaid;
          repairs.push(`Fixed paidAmount precision: ${order.paidAmount} → ${roundedPaid}`);
          wasCorrupted = true;
        }
      }

      // Fix payment status inconsistencies
      const totalAmount = updates.totalAmount || order.totalAmount || 0;
      const paidAmount = updates.paidAmount || order.paidAmount || 0;
      
      let correctStatus = 'pending';
      if (paidAmount >= totalAmount) {
        correctStatus = 'paid';
      } else if (paidAmount > 0) {
        correctStatus = 'partially_paid';
      }

      if (order.paymentStatus !== correctStatus) {
        updates.paymentStatus = correctStatus;
        repairs.push(`Fixed paymentStatus: ${order.paymentStatus} → ${correctStatus}`);
        wasCorrupted = true;
      }

      // Apply repairs if needed
      if (wasCorrupted && Object.keys(updates).length > 0) {
        await this.storage.updateOrder(orderId, updates);
        console.log(`Repaired order ${orderId}:`, repairs);
      }

      const repairedOrder = wasCorrupted ? await this.storage.getOrder(orderId) : order;
      
      return {
        wasCorrupted,
        repairs,
        order: repairedOrder
      };
    } catch (error) {
      console.error(`Failed to repair order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Scan and repair all orders for a customer
   */
  async repairCustomerOrders(customerId: string): Promise<{
    totalOrders: number;
    corruptedOrders: number;
    repairs: Array<{orderId: string, repairs: string[]}>;
  }> {
    try {
      const orders = await this.storage.getOrdersByCustomer(customerId);
      const results = {
        totalOrders: orders.length,
        corruptedOrders: 0,
        repairs: [] as Array<{orderId: string, repairs: string[]}>
      };

      for (const order of orders) {
        const repairResult = await this.repairOrder(order.id);
        if (repairResult.wasCorrupted) {
          results.corruptedOrders++;
          results.repairs.push({
            orderId: order.id,
            repairs: repairResult.repairs
          });
        }
      }

      console.log(`Customer ${customerId} repair summary:`, {
        total: results.totalOrders,
        corrupted: results.corruptedOrders,
        repaired: results.repairs.length
      });

      return results;
    } catch (error) {
      console.error(`Failed to repair customer orders for ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Validate and repair financial data integrity
   */
  async validateFinancialIntegrity(customerId: string): Promise<{
    isValid: boolean;
    issues: string[];
    repairs: string[];
  }> {
    const issues: string[] = [];
    const repairs: string[] = [];

    try {
      // Repair orders first
      const orderRepairs = await this.repairCustomerOrders(customerId);
      if (orderRepairs.corruptedOrders > 0) {
        repairs.push(`Repaired ${orderRepairs.corruptedOrders} corrupted orders`);
      }

      // Get customer and recalculate pending amount
      const customer = await this.storage.getCustomer(customerId);
      if (!customer) {
        issues.push('Customer not found');
        return { isValid: false, issues, repairs };
      }

      const orders = await this.storage.getOrdersByCustomer(customerId);
      const unpaidOrders = orders.filter(o => o.paymentStatus !== 'paid');
      
      let calculatedPending = 0;
      for (const order of unpaidOrders) {
        const totalAmount = order.totalAmount || 0;
        const paidAmount = order.paidAmount || 0;
        const balance = MoneyUtils.subtract(totalAmount, paidAmount);
        calculatedPending = MoneyUtils.add(calculatedPending, balance);
      }

      const storedPending = customer.pendingAmount || 0;
      const roundedCalculated = MoneyUtils.round(calculatedPending);
      const roundedStored = MoneyUtils.round(storedPending);

      if (roundedCalculated !== roundedStored) {
        issues.push(`Pending amount mismatch: stored=${roundedStored}, calculated=${roundedCalculated}`);
        
        // Auto-repair if the difference is reasonable
        const difference = Math.abs(roundedCalculated - roundedStored);
        if (difference < 1000) { // Auto-repair differences under ₹1000
          await this.storage.updateCustomer(customerId, { pendingAmount: roundedCalculated });
          repairs.push(`Fixed pending amount: ${roundedStored} → ${roundedCalculated}`);
        }
      }

      return {
        isValid: issues.length === 0,
        issues,
        repairs
      };
    } catch (error) {
      console.error(`Financial integrity validation failed for customer ${customerId}:`, error);
      issues.push(`Validation error: ${error}`);
      return { isValid: false, issues, repairs };
    }
  }
}