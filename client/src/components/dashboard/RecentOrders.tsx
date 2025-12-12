import { Link } from "wouter";
import { Order, Customer } from "@shared/types";
import { getItemLabel } from "@shared/constants";
import { format } from "date-fns";

interface RecentOrdersProps {
  orders: Order[];
  customers: Customer[];
}

export default function RecentOrders({ orders, customers }: RecentOrdersProps) {
  // Get customer name by ID
  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Unknown Customer';
  };
  
  // Format items for display
  const formatItems = (order: Order) => {
    const items = Array.isArray(order.items) ? order.items : [];
    if (items.length === 0) return 'No items';
    
    // Take first 2 items and summarize
    const displayItems = items.slice(0, 2).map(item => 
      `${item.quantity} kg ${getItemLabel(item.type)}`
    ).join(', ');
    
    return items.length > 2 
      ? `${displayItems} and ${items.length - 2} more` 
      : displayItems;
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Recent Orders</h3>
          <Link href="/orders" className="text-sm font-medium text-blue-600 hover:text-blue-500">
            View all
          </Link>
        </div>
      </div>
      <div className="divide-y divide-gray-200 max-h-[300px] overflow-y-auto">
        {orders.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            No recent orders found
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-blue-600 truncate">
                  {getCustomerName(order.customerId)}
                </p>
                <div className="ml-2 flex-shrink-0 flex">
                  <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${order.paymentStatus === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'}`}>
                    {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                  </p>
                </div>
              </div>
              <div className="mt-2 sm:flex sm:justify-between">
                <div className="sm:flex">
                  <p className="flex items-center text-sm text-gray-500">
                    <i className="fas fa-drumstick-bite flex-shrink-0 mr-1.5 text-gray-400"></i>
                    {formatItems(order)}
                  </p>
                </div>
                <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                  <i className="fas fa-calendar flex-shrink-0 mr-1.5 text-gray-400"></i>
                  <p>
                    {(() => {
                      // Enterprise timestamp handling - use createdAt
                      const timestamp = order.createdAt;
                      try {
                        return format(new Date(timestamp), 'PPpp');
                      } catch (error) {
                        return 'Invalid date';
                      }
                    })()}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex justify-between">
                <div className="text-sm text-gray-900 font-medium">₹{(order.totalAmount || 0).toFixed(2)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
