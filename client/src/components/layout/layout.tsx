import { ReactNode, useState, createContext, useContext, useEffect, useCallback } from "react";
import { Sidebar, defaultNavigation } from "./sidebar";
import { TopNav } from "./top-nav";
import { useLocation } from "wouter";

interface LayoutProps {
  children: ReactNode;
}

const NavContext = createContext({
  navigation: defaultNavigation,
  setNavigation: (nav: typeof defaultNavigation) => {}
});

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [navigation, setNavigation] = useState(defaultNavigation);
  const [location] = useLocation();

  // Reset navigation when route changes
  useEffect(() => {
    setNavigation(defaultNavigation);
  }, [location]);

  const handleSetNavigation = useCallback((nav: typeof defaultNavigation) => {
    setNavigation(nav);
  }, []);

  return (
    <NavContext.Provider value={{ navigation, setNavigation: handleSetNavigation }}>
      <div className="min-h-screen bg-background">
        <TopNav onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex h-[calc(100vh-4rem)]">
          <Sidebar isOpen={sidebarOpen} />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </NavContext.Provider>
  );
}

// Hook for child pages to modify nav
export function useNav() {
  return useContext(NavContext);
}