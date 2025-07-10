import { useLocation } from "wouter";
import { useState } from "react";

interface HeaderProps {
  toggleSidebar: () => void;
  pageTitle: string;
}

export default function Header({ toggleSidebar, pageTitle }: HeaderProps) {
  const [location] = useLocation();
  const [searchVisible, setSearchVisible] = useState(false);
  
  const toggleSearch = () => {
    setSearchVisible(!searchVisible);
  };

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
          <button 
            className="md:hidden p-2.5 text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none"
            onClick={toggleSearch}
          >
            <i className="fas fa-search"></i>
          </button>
          
          <div className="hidden md:flex items-center px-3 py-2 bg-gray-100 rounded-lg">
            <i className="fas fa-search text-gray-500 mr-2"></i>
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-transparent border-none outline-none text-gray-600 placeholder:text-gray-400 text-sm w-32"
            />
          </div>
          
          <button className="p-2.5 text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 relative focus:outline-none">
            <i className="fas fa-bell"></i>
            <span className="absolute top-0 right-0 w-2 h-2 bg-orange-500 rounded-full"></span>
          </button>
          
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
            <input 
              type="text"
              placeholder="Search..." 
              className="bg-transparent border-none outline-none text-gray-600 placeholder:text-gray-400 text-sm w-full"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
}
