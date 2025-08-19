import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Bell, Menu, X, User, Users, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

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
    enabled: searchQuery.length > 1
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications']
  });

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return { customers: [] };

    const query = searchQuery.toLowerCase();
    
    const filteredCustomers = (customers as any[]).filter((customer: any) =>
      customer.name?.toLowerCase().includes(query) ||
      customer.contact?.includes(query) ||
      customer.phone?.includes(query)
    ).slice(0, 5);

    return {
      customers: filteredCustomers
    };
  }, [searchQuery, customers]);

  // Notification counts
  const unreadNotifications = (notifications as any[]).filter((n: any) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 flex flex-col bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-lg">
      <div className="flex items-center justify-between h-16 sm:h-18 px-4 sm:px-8">
        <div className="flex items-center space-x-4">
          <button 
            onClick={toggleSidebar}
            className="p-3 text-slate-600 bg-slate-50 rounded-xl hover:bg-slate-100 hover:text-slate-700 md:hidden focus:outline-none transition-all duration-200 shadow-sm"
            aria-label="Toggle sidebar"
          >
            <Menu size={18} />
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
              <Users size={16} className="text-white" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent truncate max-w-[200px] sm:max-w-sm">
              {pageTitle}
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Mobile Search Toggle */}
          <button 
            className="md:hidden p-3 text-slate-600 bg-slate-50 rounded-xl hover:bg-slate-100 hover:text-slate-700 focus:outline-none transition-all duration-200 shadow-sm"
            onClick={toggleSearch}
          >
            <Search size={18} />
          </button>
          
          {/* Desktop Search with Popover Results */}
          <Popover open={searchQuery.length > 1 && !searchVisible} onOpenChange={(open) => !open && setSearchQuery('')}>
            <PopoverTrigger asChild>
              <div className="hidden md:flex items-center px-4 py-3 bg-slate-50/80 backdrop-blur-sm rounded-2xl relative border border-slate-200 hover:bg-slate-100/80 transition-all duration-200 shadow-sm min-w-[280px]">
                <Search size={18} className="text-slate-500 mr-3" />
                <Input
                  type="text" 
                  placeholder="Search customers..." 
                  className="bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 text-sm w-full h-6 p-0 focus-visible:ring-0 font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-3 text-slate-400 hover:text-slate-600 transition-colors duration-200 p-1 rounded-full hover:bg-slate-200"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0 border-0 shadow-2xl rounded-2xl" align="end">
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-t-2xl">
                <span className="text-sm font-semibold text-slate-800 flex items-center">
                  <Search size={16} className="mr-2 text-slate-600" />
                  Search Results
                </span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-all duration-200"
                >
                  <X size={16} />
                </button>
              </div>
              <ScrollArea className="max-h-80">
                <div className="p-4">
                  {searchResults.customers.length > 0 ? (
                    <div className="mb-4">
                      <h4 className="font-semibold text-sm text-slate-700 mb-3 flex items-center">
                        <Users size={16} className="mr-2 text-blue-500" />
                        Customers
                      </h4>
                      {searchResults.customers.map((customer: any) => (
                        <div key={customer.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-all duration-200 border border-transparent hover:border-slate-200 hover:shadow-sm">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                              <User size={16} className="text-white" />
                            </div>
                            <div>
                              <div className="font-semibold text-sm text-slate-800">{customer.name}</div>
                              <div className="text-xs text-slate-500">{customer.contact || customer.phone}</div>
                            </div>
                          </div>
                          <div className="text-xs bg-gradient-to-r from-red-50 to-red-100 text-red-700 px-3 py-1.5 rounded-full font-semibold border border-red-200">
                            ₹{(customer.pendingAmount || 0).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : searchQuery.length > 1 && (
                    <div className="text-center py-8 text-slate-500">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search size={24} className="text-slate-400" />
                      </div>
                      <div className="font-medium">No customers found</div>
                      <div className="text-sm text-slate-400 mt-1">Try searching for "{searchQuery}"</div>
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
                className="p-3 text-slate-600 bg-slate-50 rounded-xl hover:bg-slate-100 hover:text-slate-700 relative transition-all duration-200 shadow-sm"
              >
                <Bell size={18} />
                {unreadNotifications > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs bg-gradient-to-r from-red-500 to-red-600 border-2 border-white shadow-lg animate-pulse">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 border-0 shadow-2xl rounded-2xl" align="end">
              <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 flex items-center">
                    <Bell size={18} className="mr-2 text-slate-600" />
                    Notifications
                  </h3>
                  {unreadNotifications > 0 && (
                    <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold">
                      {unreadNotifications} new
                    </Badge>
                  )}
                </div>
              </div>
              <ScrollArea className="max-h-96">
                <div className="p-3">
                  {(notifications as any[]).length > 0 ? (
                    (notifications as any[]).slice(0, 10).map((notification: any) => {
                      const getNotificationIcon = (type: string) => {
                        switch (type) {
                          case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
                          case 'error': return <AlertCircle size={16} className="text-red-500" />;
                          case 'success': return <CheckCircle size={16} className="text-green-500" />;
                          default: return <Info size={16} className="text-blue-500" />;
                        }
                      };
                      
                      return (
                        <div 
                          key={notification.id} 
                          className={`p-3 rounded-xl mb-2 cursor-pointer hover:bg-slate-50 transition-all duration-200 border ${
                            !notification.read 
                              ? 'bg-gradient-to-r from-blue-50 to-blue-50/50 border-blue-200 shadow-sm' 
                              : 'border-transparent hover:border-slate-200'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="mt-0.5">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-sm text-slate-800">{notification.title}</div>
                              <div className="text-xs text-slate-600 mt-1 leading-relaxed">{notification.message}</div>
                              <div className="text-xs text-slate-400 mt-2 font-medium">{notification.time}</div>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 mt-1"></div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Bell size={24} className="text-slate-400" />
                      </div>
                      <div className="font-medium">No notifications</div>
                      <div className="text-sm text-slate-400 mt-1">You're all caught up!</div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
          
          <div className="relative">
            <div className="flex items-center cursor-pointer group">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white shadow-lg ring-2 ring-orange-100 group-hover:shadow-xl transition-all duration-200">
                <span className="text-sm font-bold">AD</span>
              </div>
              <div className="ml-3 hidden md:block">
                <div className="text-sm font-bold text-slate-800">Admin</div>
                <div className="text-xs text-slate-500">Administrator</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Search Bar */}
      {searchVisible && (
        <div className="px-4 py-3 md:hidden bg-gradient-to-r from-slate-50 to-slate-100/50 border-t border-slate-200">
          <div className="flex items-center bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
            <Search size={18} className="text-slate-500 mr-3" />
            <Input
              type="text"
              placeholder="Search customers..." 
              className="bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 text-sm w-full h-6 p-0 focus-visible:ring-0 font-medium"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchVisible(false);
              }}
              className="ml-3 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-all duration-200"
            >
              <X size={16} />
            </button>
          </div>
          
          {/* Mobile Search Results */}
          {searchQuery && searchQuery.length > 1 && (
            <div className="mt-3 bg-white border border-slate-200 rounded-2xl shadow-xl">
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-t-2xl">
                <span className="text-sm font-semibold text-slate-800 flex items-center">
                  <Search size={16} className="mr-2 text-slate-600" />
                  Search Results
                </span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-all duration-200"
                >
                  <X size={16} />
                </button>
              </div>
              <ScrollArea className="max-h-60">
                <div className="p-4">
                  {searchResults.customers.length > 0 ? (
                    <div className="mb-3">
                      <h4 className="font-semibold text-sm text-slate-700 mb-3 flex items-center">
                        <Users size={16} className="mr-2 text-blue-500" />
                        Customers
                      </h4>
                      {searchResults.customers.map((customer: any) => (
                        <div key={customer.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-all duration-200 border border-transparent hover:border-slate-200">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                              <User size={16} className="text-white" />
                            </div>
                            <div>
                              <div className="font-semibold text-sm text-slate-800">{customer.name}</div>
                              <div className="text-xs text-slate-500">{customer.contact || customer.phone}</div>
                            </div>
                          </div>
                          <div className="text-xs bg-gradient-to-r from-red-50 to-red-100 text-red-700 px-3 py-1.5 rounded-full font-semibold border border-red-200">
                            ₹{(customer.pendingAmount || 0).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : searchQuery.length > 1 && (
                    <div className="text-center py-6 text-slate-500">
                      <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Search size={20} className="text-slate-400" />
                      </div>
                      <div className="font-medium text-sm">No customers found</div>
                      <div className="text-xs text-slate-400 mt-1">Try searching for "{searchQuery}"</div>
                    </div>
                  )}
              </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
