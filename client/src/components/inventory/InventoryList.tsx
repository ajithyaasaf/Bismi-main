import { Inventory } from "@shared/types";
import { getItemLabel } from "@shared/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface InventoryListProps {
  items: Inventory[];
  isLoading?: boolean;
  onEdit: (item: Inventory) => void;
  onDelete: (item: Inventory) => void;
}

export default function InventoryList({ items, onEdit, onDelete }: InventoryListProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <i className="fas fa-boxes text-gray-400 text-4xl mb-3"></i>
          <h3 className="text-lg font-medium text-gray-900">No inventory items found</h3>
          <p className="text-sm text-gray-500 mt-1">Add your first item to get started</p>
        </CardContent>
      </Card>
    );
  }

  // Use centralized item label formatting
  const formatType = (type: string) => {
    return getItemLabel(type);
  };

  return (
    <>
      {/* Mobile view - Card layout */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-medium text-lg">{formatType(item.type)}</h3>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 w-9"
                    onClick={() => onEdit(item)}
                  >
                    <i className="fas fa-edit"></i>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 w-9 text-red-600" 
                    onClick={() => onDelete(item)}
                  >
                    <i className="fas fa-trash"></i>
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 p-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Quantity</p>
                  <p className={`font-medium ${
                    item.quantity < 0 
                      ? 'text-red-700 font-bold' 
                      : item.quantity < 2 
                      ? 'text-red-600' 
                      : item.quantity < 5 
                      ? 'text-amber-600' 
                      : ''
                  }`}>
                    {(item.quantity || 0) < 0 ? 'Negative: ' : ''}{(item.quantity || 0).toFixed(2)} kg
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Rate</p>
                  <p className="font-medium">₹{(item.price || 0).toFixed(2)}/kg</p>
                </div>
                
                <div className="space-y-1 col-span-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500">Total Value</p>
                  <p className="font-bold text-lg">₹{((item.quantity || 0) * (item.price || 0)).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Desktop view - Table layout */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantity (kg)</TableHead>
                <TableHead className="text-right">Rate (₹/kg)</TableHead>
                <TableHead className="text-right">Value (₹)</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{formatType(item.type)}</TableCell>
                  <TableCell className={`text-right ${
                    item.quantity < 0 
                      ? 'text-red-700 font-bold' 
                      : item.quantity < 2 
                      ? 'text-red-600 font-medium' 
                      : item.quantity < 5 
                      ? 'text-amber-600 font-medium' 
                      : ''
                  }`}>
                    {item.quantity < 0 ? 'Negative: ' : ''}{item.quantity.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{item.price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{(item.quantity * item.price).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onEdit(item)}
                      >
                        <i className="fas fa-edit"></i>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600" 
                        onClick={() => onDelete(item)}
                      >
                        <i className="fas fa-trash"></i>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
