import { Inventory } from "@shared/types";
import { getItemLabel } from "@shared/constants";

interface LowStockAlertProps {
  lowStockItems: Inventory[];
  onAddStock: () => void;
}

export default function LowStockAlert({ lowStockItems, onAddStock }: LowStockAlertProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Enterprise Stock Monitor</h3>
        <p className="text-xs text-gray-500 mt-1">Tracking all stock levels including negative inventory</p>
      </div>
      <div className="divide-y divide-gray-200 max-h-[200px] overflow-y-auto">
        {lowStockItems.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            All stock levels above 5kg threshold
          </div>
        ) : (
          lowStockItems.map(item => {
            const isNegative = item.quantity < 0;
            const isCritical = item.quantity < 2 && item.quantity >= 0;
            
            return (
              <div key={item.id} className="px-4 py-3 sm:px-6 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0 mr-3">
                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      isNegative 
                        ? 'bg-red-200 border-2 border-red-400' 
                        : isCritical 
                        ? 'bg-red-100' 
                        : 'bg-yellow-100'
                    }`}>
                      <i className={`fas ${
                        isNegative 
                          ? 'fa-minus text-red-700' 
                          : 'fa-exclamation'
                      } ${
                        isCritical ? 'text-red-600' : 'text-yellow-600'
                      }`}></i>
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{getItemLabel(item.type)}</p>
                    <p className={`text-xs ${
                      isNegative 
                        ? 'text-red-600 font-medium' 
                        : 'text-gray-500'
                    }`}>
                      {isNegative 
                        ? `Negative stock: ${(item.quantity || 0).toFixed(1)} kg` 
                        : `Low stock: ${(item.quantity || 0).toFixed(1)} kg remaining`
                      }
                    </p>
                  </div>
                </div>
                <button 
                  onClick={onAddStock}
                  className={`inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded focus:outline-none ${
                    isNegative
                      ? 'text-red-700 bg-red-100 hover:bg-red-200'
                      : 'text-orange-700 bg-orange-100 hover:bg-orange-200'
                  }`}
                >
                  {isNegative ? 'Restock Now' : 'Order Stock'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
