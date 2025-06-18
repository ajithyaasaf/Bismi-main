import { Supplier } from "@shared/types";
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

interface SuppliersListProps {
  suppliers: Supplier[];
  isLoading?: boolean;
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
  onPayment: (supplierId: string, supplierName: string) => void;
}

export default function SuppliersList({ 
  suppliers, 
  isLoading,
  onEdit, 
  onDelete,
  onPayment 
}: SuppliersListProps) {
  if (suppliers.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <i className="fas fa-truck-loading text-gray-400 text-4xl mb-3"></i>
          <h3 className="text-lg font-medium text-gray-900">No suppliers found</h3>
          <p className="text-sm text-gray-500 mt-1">Add your first supplier to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Mobile view - Card layout */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {suppliers.map((supplier) => (
          <Card key={supplier.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-lg">{supplier.name}</h3>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 w-9"
                    onClick={() => onEdit(supplier)}
                  >
                    <i className="fas fa-edit"></i>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 w-9 text-red-600" 
                    onClick={() => onDelete(supplier)}
                  >
                    <i className="fas fa-trash"></i>
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 p-4 border-b border-gray-100">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Contact</p>
                  <p className="font-medium">{supplier.contact || "-"}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Outstanding Debt</p>
                  <p className={`font-bold text-base ${supplier.pendingAmount > 0 ? 'text-red-600' : ''}`}>
                    ₹{supplier.pendingAmount.toFixed(2)}
                  </p>
                </div>
              </div>
              
              {supplier.pendingAmount > 0 && (
                <div className="p-3 bg-gray-50">
                  <Button 
                    variant="outline"
                    className="w-full justify-center text-green-600 border-green-200 hover:bg-green-50" 
                    onClick={() => onPayment(supplier.id, supplier.name)}
                  >
                    <i className="fas fa-money-bill-wave mr-2"></i>
                    Record Payment
                  </Button>
                </div>
              )}
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
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Debt</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.contact || "-"}</TableCell>
                  <TableCell className={`text-right ${supplier.pendingAmount > 0 ? 'text-red-600 font-medium' : ''}`}>
                    ₹{supplier.pendingAmount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onEdit(supplier)}
                      >
                        <i className="fas fa-edit"></i>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600" 
                        onClick={() => onDelete(supplier)}
                      >
                        <i className="fas fa-trash"></i>
                      </Button>
                      {supplier.pendingAmount > 0 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-green-600" 
                          onClick={() => onPayment(supplier.id, supplier.name)}
                        >
                          <i className="fas fa-money-bill-wave"></i>
                        </Button>
                      )}
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
