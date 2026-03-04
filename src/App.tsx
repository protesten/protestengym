import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import Index from "./pages/Index";
import Exercises from "./pages/Exercises";
import Routines from "./pages/Routines";
import RoutineDetail from "./pages/RoutineDetail";
import NewSession from "./pages/NewSession";
import SessionDetail from "./pages/SessionDetail";
import Analysis from "./pages/Analysis";
import Profile from "./pages/Profile";
import Measurements from "./pages/Measurements";
import Programs from "./pages/Programs";
import MonthlyReport from "./pages/MonthlyReport";
import SessionCalendar from "./pages/SessionCalendar";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><div className="min-h-screen pb-14 w-full overflow-x-hidden"><Index /><BottomNav /></div></ProtectedRoute>} />
            <Route path="/exercises" element={<ProtectedRoute><div className="min-h-screen pb-14 w-full overflow-x-hidden"><Exercises /><BottomNav /></div></ProtectedRoute>} />
            <Route path="/routines" element={<ProtectedRoute><div className="min-h-screen pb-14 w-full overflow-x-hidden"><Routines /><BottomNav /></div></ProtectedRoute>} />
            <Route path="/routines/:id" element={<ProtectedRoute><div className="min-h-screen pb-14 w-full overflow-x-hidden"><RoutineDetail /><BottomNav /></div></ProtectedRoute>} />
            <Route path="/session/new" element={<ProtectedRoute><div className="min-h-screen pb-14 w-full overflow-x-hidden"><NewSession /><BottomNav /></div></ProtectedRoute>} />
            <Route path="/session/:id" element={<ProtectedRoute><div className="min-h-screen pb-14 w-full overflow-x-hidden"><SessionDetail /><BottomNav /></div></ProtectedRoute>} />
            <Route path="/analysis" element={<ProtectedRoute><div className="min-h-screen pb-14 w-full overflow-x-hidden"><Analysis /><BottomNav /></div></ProtectedRoute>} />
            <Route path="/measurements" element={<ProtectedRoute><div className="min-h-screen pb-14 w-full overflow-x-hidden"><Measurements /><BottomNav /></div></ProtectedRoute>} />
            <Route path="/programs" element={<ProtectedRoute><div className="min-h-screen pb-14 w-full overflow-x-hidden"><Programs /><BottomNav /></div></ProtectedRoute>} />
            <Route path="/report" element={<ProtectedRoute><div className="min-h-screen pb-14 w-full overflow-x-hidden"><MonthlyReport /><BottomNav /></div></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><div className="min-h-screen pb-14 w-full overflow-x-hidden"><SessionCalendar /><BottomNav /></div></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><div className="min-h-screen pb-14 w-full overflow-x-hidden"><Profile /><BottomNav /></div></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
