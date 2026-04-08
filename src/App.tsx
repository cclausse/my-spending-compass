import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Link, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthGuard } from "@/components/AuthGuard";
import Index from "./pages/Index.tsx";
import ImportPage from "./pages/Import.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function NavBar() {
  const location = useLocation();
  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto flex items-center gap-4 px-4 py-2">
        <Link
          to="/"
          className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
            location.pathname === '/' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Oversikt
        </Link>
        <Link
          to="/import"
          className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
            location.pathname === '/import' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Import
        </Link>
      </div>
    </nav>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthGuard>
          <NavBar />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthGuard>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
