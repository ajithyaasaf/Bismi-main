import { IStorage } from '../storage';
import { OrderItem } from '@shared/types';
import { createValidationError } from '../../shared/validation';

/**
 * Comprehensive inventory management system
 * Handles stock validation, deduction, and restoration with data integrity
 */
export class InventoryManager {
  constructor(private storage: IStorage) {}

  /**
   * Validate stock availability for order items
   */
  async validateStockAvailability(items: OrderItem[]): Promise<void> {
    const inventory = await this.storage.getAllInventory();
    
    for (const item of items) {
      const inventoryItem = inventory.find(inv => inv.type === item.type);
      
      if (!inventoryItem) {
        throw createValidationError(
          `Item type '${item.type}' not found in inventory`,
          'items'
        );
      }
      
      if (inventoryItem.quantity < item.quantity) {
        throw createValidationError(
          `Insufficient stock for ${item.type}. Requested: ${item.quantity}${inventoryItem.unit}, Available: ${inventoryItem.quantity}${inventoryItem.unit}`,
          'items'
        );
      }
    }
  }

  /**
   * Deduct stock from inventory for confirmed orders
   */
  async deductStock(items: OrderItem[], orderId: string): Promise<void> {
    const inventory = await this.storage.getAllInventory();
    const stockAdjustments: Array<{itemId: string, originalQuantity: number, newQuantity: number}> = [];
    
    try {
      for (const item of items) {
        const inventoryItem = inventory.find(inv => inv.type === item.type);
        
        if (inventoryItem) {
          const newQuantity = inventoryItem.quantity - item.quantity;
          
          if (newQuantity < 0) {
            throw createValidationError(
              `Cannot deduct ${item.quantity}${inventoryItem.unit} of ${item.type} - insufficient stock`,
              'items'
            );
          }
          
          // Update inventory
          await this.storage.updateInventoryItem(inventoryItem.id, {
            quantity: newQuantity
          });
          
          // Track adjustment for potential rollback
          stockAdjustments.push({
            itemId: inventoryItem.id,
            originalQuantity: inventoryItem.quantity,
            newQuantity: newQuantity
          });
          
          // Create stock adjustment transaction
          await this.storage.createTransaction({
            entityId: inventoryItem.supplierId || 'system',
            entityType: 'supplier',
            type: 'stock_adjustment',
            amount: item.quantity * item.rate,
            description: `Stock deduction for order ${orderId}: ${item.quantity}${inventoryItem.unit} ${item.type}`
          });
          
          console.log(`Stock deducted: ${item.type} - ${item.quantity}${inventoryItem.unit} (remaining: ${newQuantity}${inventoryItem.unit})`);
        }
      }
    } catch (error) {
      // Rollback stock adjustments if any item fails
      console.error('Stock deduction failed, rolling back:', error);
      for (const adjustment of stockAdjustments) {
        try {
          await this.storage.updateInventoryItem(adjustment.itemId, {
            quantity: adjustment.originalQuantity
          });
        } catch (rollbackError) {
          console.error(`Failed to rollback stock for item ${adjustment.itemId}:`, rollbackError);
        }
      }
      throw error;
    }
  }

  /**
   * Restore stock to inventory for cancelled orders
   */
  async restoreStock(items: OrderItem[], orderId: string): Promise<void> {
    const inventory = await this.storage.getAllInventory();
    
    for (const item of items) {
      const inventoryItem = inventory.find(inv => inv.type === item.type);
      
      if (inventoryItem) {
        const newQuantity = inventoryItem.quantity + item.quantity;
        
        // Update inventory
        await this.storage.updateInventoryItem(inventoryItem.id, {
          quantity: newQuantity
        });
        
        // Create stock adjustment transaction
        await this.storage.createTransaction({
          entityId: inventoryItem.supplierId || 'system',
          entityType: 'supplier',
          type: 'stock_adjustment',
          amount: -(item.quantity * item.rate),
          description: `Stock restoration for cancelled order ${orderId}: ${item.quantity}${inventoryItem.unit} ${item.type}`
        });
        
        console.log(`Stock restored: ${item.type} + ${item.quantity}${inventoryItem.unit} (total: ${newQuantity}${inventoryItem.unit})`);
      }
    }
  }

  /**
   * Get low stock items for dashboard alerts
   */
  async getLowStockItems(threshold: number = 5): Promise<any[]> {
    const inventory = await this.storage.getAllInventory();
    
    return inventory
      .filter(item => item.quantity <= threshold)
      .sort((a, b) => a.quantity - b.quantity)
      .map(item => ({
        ...item,
        alertLevel: item.quantity <= 0 ? 'critical' : item.quantity <= 2 ? 'warning' : 'low'
      }));
  }

  /**
   * Calculate total inventory value
   */
  async calculateInventoryValue(): Promise<{totalValue: number, itemCount: number}> {
    const inventory = await this.storage.getAllInventory();
    
    const totalValue = inventory.reduce((sum, item) => {
      return sum + (item.quantity * item.price);
    }, 0);
    
    return {
      totalValue: Math.round(totalValue * 100) / 100,
      itemCount: inventory.length
    };
  }

  /**
   * Generate inventory report
   */
  async generateInventoryReport(): Promise<any> {
    const inventory = await this.storage.getAllInventory();
    const lowStockItems = await this.getLowStockItems();
    const {totalValue, itemCount} = await this.calculateInventoryValue();
    
    // Group by type for analysis
    const byType = inventory.reduce((groups, item) => {
      if (!groups[item.type]) {
        groups[item.type] = {
          type: item.type,
          totalQuantity: 0,
          totalValue: 0,
          itemCount: 0
        };
      }
      
      groups[item.type].totalQuantity += item.quantity;
      groups[item.type].totalValue += (item.quantity * item.price);
      groups[item.type].itemCount += 1;
      
      return groups;
    }, {} as any);
    
    return {
      summary: {
        totalValue,
        totalItems: itemCount,
        lowStockCount: lowStockItems.length,
        criticalStockCount: lowStockItems.filter(item => item.quantity <= 0).length
      },
      byType: Object.values(byType),
      lowStockItems,
      lastUpdated: new Date().toISOString()
    };
  }
}

export const createInventoryManager = (storage: IStorage) => new InventoryManager(storage);