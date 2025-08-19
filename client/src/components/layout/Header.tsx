import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HeaderProps {
  toggleSidebar: () => void;
  pageTitle: string;
}

export default function Header({ toggleSidebar, pageTitle }: HeaderProps) {
  const [location] = useLocation();
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  const toggleSearch = () => {
    setSearchVisible(!searchVisible);
  };

  // Fetch data for search functionality
  const { data: customers = [] } = useQuery({
    queryKey: ['/api/customers'],
    enabled: searchQuery.length > 0
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['/api/orders'],
    enabled: searchQuery.length > 0
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['/api/inventory'],
    enabled: searchQuery.length > 0
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications']
  });

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return { customers: [], orders: [], inventory: [] };

    const query = searchQuery.toLowerCase();
    
    const filteredCustomers = (customers as any[]).filter((customer: any) =>
      customer.name?.toLowerCase().includes(query) ||
      customer.phone?.includes(query)
    ).slice(0, 3);

    const filteredOrders = (orders as any[]).filter((order: any) =>
      order.id?.toLowerCase().includes(query) ||
      order.customerName?.toLowerCase().includes(query)
    ).slice(0, 3);

    const filteredInventory = (inventory as any[]).filter((item: any) =>
      item.name?.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query)
    ).slice(0, 3);

    return {
      customers: filteredCustomers,
      orders: filteredOrders,
      inventory: filteredInventory
    };
  }, [searchQuery, customers, orders, inventory]);

  // Notification counts
  const unreadNotifications = (notifications as any[]).filter((n: any) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 flex flex-col bg-white border-b border-gray-100 shadow-sm">
      <div className="flex items-center justify-between h-16 sm:h-20 px-3 sm:px-6">
        <div className="flex items-center">
          <button 
            onClick={toggleSidebar}
            className="p-2.5 mr-3 text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 md:hidden focus:outline-none"
            aria-label="Toggle sidebar"
          >
            <i className="fas fa-bars"></i>
          </button>

          <h2 className="text-lg sm:text-xl font-bold text-gray-800 truncate max-w-[180px] sm:max-w-xs">
            {pageTitle}
          </h2>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Mobile Search Toggle */}
          <button 
            className="md:hidden p-2.5 text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none"
            onClick={toggleSearch}
          >
            <i className="fas fa-search"></i>
          </button>
          
          {/* Desktop Search with Popover Results */}
          <Popover open={searchQuery.length > 0}>
            <PopoverTrigger asChild>
              <div className="hidden md:flex items-center px-3 py-2 bg-gray-100 rounded-lg">
                <i className="fas fa-search text-gray-500 mr-2"></i>
                <Input
                  type="text" 
                  placeholder="Search customers, orders, inventory..." 
                  className="bg-transparent border-none outline-none text-gray-600 placeholder:text-gray-400 text-sm w-56 h-6 p-0 focus-visible:ring-0"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="end">
              <ScrollArea className="max-h-80">
                <div className="p-4">
                  {searchResults.customers.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-sm text-gray-600 mb-2">Customers</h4>
                      {searchResults.customers.map((customer: any) => (
                        <div key={customer.id} className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                          <i className="fas fa-user text-blue-500 w-4 mr-3"></i>
                          <div>
                            <div className="font-medium text-sm">{customer.name}</div>
                            <div className="text-xs text-gray-500">{customer.phone}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.orders.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-sm text-gray-600 mb-2">Orders</h4>
                      {searchResults.orders.map((order: any) => (
                        <div key={order.id} className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                          <i className="fas fa-shopping-cart text-green-500 w-4 mr-3"></i>
                          <div>
                            <div className="font-medium text-sm">Order #{order.id}</div>
                            <div className="text-xs text-gray-500">{order.customerName} • ${order.total}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.inventory.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-sm text-gray-600 mb-2">Inventory</h4>
                      {searchResults.inventory.map((item: any) => (
                        <div key={item.id} className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                          <i className="fas fa-box text-orange-500 w-4 mr-3"></i>
                          <div>
                            <div className="font-medium text-sm">{item.name}</div>
                            <div className="text-xs text-gray-500">Stock: {item.quantity} • ${item.price}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchQuery && searchResults.customers.length === 0 && searchResults.orders.length === 0 && searchResults.inventory.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <i className="fas fa-search text-2xl mb-2"></i>
                      <div>No results found for "{searchQuery}"</div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
          
          {/* Notifications */}
          <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="p-2.5 text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 relative"
              >
                <i className="fas fa-bell"></i>
                {unreadNotifications > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs bg-red-500">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Notifications</h3>
                  {unreadNotifications > 0 && (
                    <Badge variant="secondary">{unreadNotifications} new</Badge>
                  )}
                </div>
              </div>
              <ScrollArea className="max-h-96">
                <div className="p-2">
                  {(notifications as any[]).length > 0 ? (
                    (notifications as any[]).slice(0, 10).map((notification: any) => (
                      <div 
                        key={notification.id} 
                        className={`p-3 rounded-lg mb-2 cursor-pointer hover:bg-gray-50 ${
                          !notification.read ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            notification.type === 'warning' ? 'bg-yellow-500' :
                            notification.type === 'error' ? 'bg-red-500' :
                            notification.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                          }`}></div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{notification.title}</div>
                            <div className="text-xs text-gray-600 mt-1">{notification.message}</div>
                            <div className="text-xs text-gray-400 mt-1">{notification.time}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <i className="fas fa-bell-slash text-2xl mb-2"></i>
                      <div>No notifications</div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
          
          <div className="relative">
            <div className="flex items-center cursor-pointer">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-orange-600 flex items-center justify-center text-white shadow-sm">
                <span className="text-sm font-medium">AD</span>
              </div>
              <span className="ml-2 text-sm font-medium text-gray-700 hidden md:inline-block">Admin</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Search Bar */}
      {searchVisible && (
        <div className="px-3 py-2 md:hidden bg-gray-50 border-t border-gray-100">
          <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2">
            <i className="fas fa-search text-gray-400 mr-2"></i>
            <Input
              type="text"
              placeholder="Search customers, orders, inventory..." 
              className="bg-transparent border-none outline-none text-gray-600 placeholder:text-gray-400 text-sm w-full h-6 p-0 focus-visible:ring-0"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Mobile Search Results */}
          {searchQuery && (
            <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              <div className="p-3">
                {searchResults.customers.length > 0 && (
                  <div className="mb-3">
                    <h4 className="font-medium text-sm text-gray-600 mb-2">Customers</h4>
                    {searchResults.customers.map((customer: any) => (
                      <div key={customer.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <i className="fas fa-user text-blue-500 w-4 mr-3"></i>
                        <div>
                          <div className="font-medium text-sm">{customer.name}</div>
                          <div className="text-xs text-gray-500">{customer.phone}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.orders.length > 0 && (
                  <div className="mb-3">
                    <h4 className="font-medium text-sm text-gray-600 mb-2">Orders</h4>
                    {searchResults.orders.map((order: any) => (
                      <div key={order.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <i className="fas fa-shopping-cart text-green-500 w-4 mr-3"></i>
                        <div>
                          <div className="font-medium text-sm">Order #{order.id}</div>
                          <div className="text-xs text-gray-500">{order.customerName} • ${order.total}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.inventory.length > 0 && (
                  <div className="mb-3">
                    <h4 className="font-medium text-sm text-gray-600 mb-2">Inventory</h4>
                    {searchResults.inventory.map((item: any) => (
                      <div key={item.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <i className="fas fa-box text-orange-500 w-4 mr-3"></i>
                        <div>
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-gray-500">Stock: {item.quantity} • ${item.price}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.customers.length === 0 && searchResults.orders.length === 0 && searchResults.inventory.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <i className="fas fa-search text-xl mb-2"></i>
                    <div className="text-sm">No results found</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
