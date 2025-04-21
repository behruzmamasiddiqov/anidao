import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import AnimePage from "@/pages/anime";
import WatchPage from "@/pages/watch";
import FavoritesPage from "@/pages/favorites";
import HistoryPage from "@/pages/history";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import { useEffect, useState } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/anime/:id" component={AnimePage} />
      <Route path="/watch/:id" component={WatchPage} />
      <Route path="/favorites" component={FavoritesPage} />
      <Route path="/history" component={HistoryPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const sidebar = document.getElementById('sidebar');
      const sidebarToggle = document.getElementById('sidebar-toggle');
      
      if (
        sidebar && 
        sidebarToggle && 
        !sidebar.contains(e.target as Node) && 
        !sidebarToggle.contains(e.target as Node)
      ) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <Sidebar isOpen={sidebarOpen} />
        
        {/* Backdrop for mobile sidebar */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden" 
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        <main className="lg:ml-64 min-h-screen pb-10">
          <Router />
        </main>
        
        <Footer />
      </div>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
