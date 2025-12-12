import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Transaction, Supplier, Customer } from "@shared/types";
import { TRANSACTION_TYPES, ENTITY_TYPES } from "@shared/constants";

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  suppliers: Supplier[];
  customers: Customer[];
  isLoading?: boolean;
  transaction?: Transaction | null;
}

export default function TransactionFormModal({
  isOpen,
  onClose,
  onSubmit,
  suppliers,
  customers,
  isLoading = false,
  transaction = null
}: TransactionFormModalProps) {
  const [formData, setFormData] = useState({
    entityType: "supplier",
    entityId: "",
    type: "payment",
    amount: "",
    description: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or transaction changes
  useEffect(() => {
    if (isOpen) {
      if (transaction) {
        setFormData({
          entityType: transaction.entityType,
          entityId: transaction.entityId,
          type: transaction.type,
          amount: transaction.amount.toString(),
          description: transaction.description
        });
      } else {
        setFormData({
          entityType: "supplier",
          entityId: "",
          type: "payment",
          amount: "",
          description: ""
        });
      }
      setErrors({});
    }
  }, [isOpen, transaction]);

  // Get available entities based on selected type
  const availableEntities = formData.entityType === "supplier" ? suppliers : customers;

  // Get available transaction types based on entity type
  const availableTransactionTypes = formData.entityType === "supplier" 
    ? [
        { value: "payment", label: "Payment to Supplier" },
        { value: "purchase", label: "Purchase from Supplier" }
      ]
    : [
        { value: "receipt", label: "Receipt from Customer" },
        { value: "sale", label: "Sale to Customer" }
      ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.entityType) {
      newErrors.entityType = "Entity type is required";
    }

    if (!formData.entityId) {
      newErrors.entityId = "Please select an entity";
    }

    if (!formData.type) {
      newErrors.type = "Transaction type is required";
    }

    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      newErrors.amount = "Please enter a valid amount greater than 0";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData = {
      ...formData,
      amount: Number(formData.amount)
    };

    onSubmit(submitData);
  };

  const handleEntityTypeChange = (entityType: string) => {
    setFormData({
      ...formData,
      entityType,
      entityId: "", // Reset entity selection
      type: entityType === "supplier" ? "payment" : "receipt" // Set default type
    });
    setErrors({ ...errors, entityType: "", entityId: "", type: "" });
  };

  const handleClose = () => {
    setFormData({
      entityType: "supplier",
      entityId: "",
      type: "payment",
      amount: "",
      description: ""
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {transaction ? "Edit Transaction" : "Add New Transaction"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Entity Type */}
          <div className="space-y-2">
            <Label htmlFor="entityType">Entity Type</Label>
            <Select
              value={formData.entityType}
              onValueChange={handleEntityTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select entity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="supplier">Supplier</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
              </SelectContent>
            </Select>
            {errors.entityType && (
              <p className="text-sm text-red-500">{errors.entityType}</p>
            )}
          </div>

          {/* Entity Selection */}
          <div className="space-y-2">
            <Label htmlFor="entityId">
              {formData.entityType === "supplier" ? "Supplier" : "Customer"}
            </Label>
            <Select
              value={formData.entityId}
              onValueChange={(value) => {
                setFormData({ ...formData, entityId: value });
                setErrors({ ...errors, entityId: "" });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${formData.entityType}`} />
              </SelectTrigger>
              <SelectContent>
                {availableEntities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.entityId && (
              <p className="text-sm text-red-500">{errors.entityId}</p>
            )}
          </div>

          {/* Transaction Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Transaction Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => {
                setFormData({ ...formData, type: value });
                setErrors({ ...errors, type: "" });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select transaction type" />
              </SelectTrigger>
              <SelectContent>
                {availableTransactionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-500">{errors.type}</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => {
                setFormData({ ...formData, amount: e.target.value });
                setErrors({ ...errors, amount: "" });
              }}
              placeholder="Enter amount"
            />
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value });
                setErrors({ ...errors, description: "" });
              }}
              placeholder="Enter transaction description"
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : transaction ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}