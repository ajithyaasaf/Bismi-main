import { useState, useEffect } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState("Dashboard");

  // Update page title based on location path
  useEffect(() => {
    const pathSegments = window.location.pathname.split('/');
    const segment = pathSegments[1];
    
    if (!segment) {
      setPageTitle("Dashboard");
    } else if (segment === 'hotel-debt') {
      setPageTitle("Hotel Debt");
    } else {
      const formattedTitle = segment.charAt(0).toUpperCase() + segment.slice(1);
      setPageTitle(formattedTitle);
    }
  }, [window.location.pathname]);

  // Close sidebar when clicking anywhere on mobile
  const handleMainContentClick = () => {
    if (sidebarOpen && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 font-body">
      <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />
      
      <div className="flex flex-col flex-1 overflow-hidden" onClick={handleMainContentClick}>
        <Header 
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
          pageTitle={pageTitle}
        />
        
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">
          <div className="page-container max-w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
