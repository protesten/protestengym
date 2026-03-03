import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import Index from "./pages/Index";
import Exercises from "./pages/Exercises";
import Routines from "./pages/Routines";
import RoutineDetail from "./pages/RoutineDetail";
import NewSession from "./pages/NewSession";
import SessionDetail from "./pages/SessionDetail";
import Analysis from "./pages/Analysis";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen pb-16">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/exercises" element={<Exercises />} />
            <Route path="/routines" element={<Routines />} />
            <Route path="/routines/:id" element={<RoutineDetail />} />
            <Route path="/session/new" element={<NewSession />} />
            <Route path="/session/:id" element={<SessionDetail />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
