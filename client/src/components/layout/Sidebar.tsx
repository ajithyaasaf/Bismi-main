import { useLocation, Link } from "wouter";

interface SidebarProps {
  isOpen: boolean;
  closeSidebar: () => void;
}

export default function Sidebar({ isOpen, closeSidebar }: SidebarProps) {
  const [location] = useLocation();

  // Navigation items with improved icons
  const navItems = [
    { name: "Dashboard", path: "/", icon: "fa-tachometer-alt" },
    { name: "Suppliers", path: "/suppliers", icon: "fa-truck-loading" },
    { name: "Inventory", path: "/inventory", icon: "fa-boxes" },
    { name: "Orders", path: "/orders", icon: "fa-shopping-cart" },
    { name: "Customers", path: "/customers", icon: "fa-users" },
    { name: "Hotel Debt", path: "/hotel-debt", icon: "fa-building" },
    { name: "Transactions", path: "/transactions", icon: "fa-exchange-alt" },
    { name: "Reports", path: "/reports", icon: "fa-chart-bar" },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location === path;
    return location.startsWith(path);
  };

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-800 bg-opacity-80 backdrop-blur-sm md:hidden"
          onClick={closeSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-xl 
          transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="flex items-center justify-center h-20 border-b border-gray-700">
          <h1 className="text-2xl font-bold font-sans">
            <span className="text-orange-500 font-bold">Bismi</span>
            <span className="ml-2 text-amber-50">Broilers Shop</span>
          </h1>
        </div>

        <div className="flex flex-col flex-1 overflow-y-auto">
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navItems.map((item) => (
              <Link 
                key={item.path} 
                href={item.path} 
                onClick={closeSidebar}
                className={`
                  flex items-center px-4 py-3 rounded-lg group transition-all duration-200
                  ${
                    isActive(item.path)
                      ? "text-white bg-orange-600 shadow-md"
                      : "text-gray-200 hover:bg-gray-700/50 hover:text-white"
                  }
                `}
              >
                <div
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full mr-3
                    ${isActive(item.path) ? "bg-white/20" : "bg-gray-800"}
                  `}
                >
                  <i className={`fas ${item.icon}`}></i>
                </div>
                <span className="font-medium">{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-5 border-t border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-600/20">
              <i className="fas fa-store text-orange-500"></i>
            </div>
            <div>
              <p className="text-sm text-gray-300">Managing</p>
              <p className="font-medium text-amber-50">Bismi Broilers</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
