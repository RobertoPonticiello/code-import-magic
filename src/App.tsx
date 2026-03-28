import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import CarbonMirror from "./pages/CarbonMirror";
import AirAlert from "./pages/AirAlert";
import ImpactStreak from "./pages/ImpactStreak";
import QuartiereVivo from "./pages/QuartiereVivo";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/carbon-mirror" element={<CarbonMirror />} />
            <Route path="/air-alert" element={<AirAlert />} />
            <Route path="/impact-streak" element={<ImpactStreak />} />
            <Route path="/quartiere-vivo" element={<QuartiereVivo />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
