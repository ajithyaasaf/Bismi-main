import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search, X } from "lucide-react";

interface TransactionFiltersProps {
  filters: {
    search: string;
    entityType: string;
    transactionType: string;
    dateRange: string;
  };
  onFiltersChange: (filters: any) => void;
  totalCount: number;
  filteredCount: number;
}

export default function TransactionFilters({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount
}: TransactionFiltersProps) {
  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      entityType: "all",
      transactionType: "all",
      dateRange: "all"
    });
  };

  const hasActiveFilters = filters.search || 
    filters.entityType !== "all" || 
    filters.transactionType !== "all" || 
    filters.dateRange !== "all";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search transactions..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Entity Type Filter */}
          <Select
            value={filters.entityType}
            onValueChange={(value) => handleFilterChange("entityType", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              <SelectItem value="supplier">Suppliers</SelectItem>
              <SelectItem value="customer">Customers</SelectItem>
            </SelectContent>
          </Select>

          {/* Transaction Type Filter */}
          <Select
            value={filters.transactionType}
            onValueChange={(value) => handleFilterChange("transactionType", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Transaction Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="receipt">Receipt</SelectItem>
              <SelectItem value="purchase">Purchase</SelectItem>
              <SelectItem value="sale">Sale</SelectItem>
            </SelectContent>
          </Select>

          {/* Results Count and Clear */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {filteredCount} of {totalCount}
            </div>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="h-8"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}