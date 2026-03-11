import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import { Loader2 } from "lucide-react";
import { getAIPreferences } from "@/lib/ai-insights";
import { getProfile } from "@/lib/api";

const Index = lazy(() => import("./pages/Index"));
const Exercises = lazy(() => import("./pages/Exercises"));
const Routines = lazy(() => import("./pages/Routines"));
const RoutineDetail = lazy(() => import("./pages/RoutineDetail"));
const NewSession = lazy(() => import("./pages/NewSession"));
const SessionDetail = lazy(() => import("./pages/SessionDetail"));
const Analysis = lazy(() => import("./pages/Analysis"));
const Profile = lazy(() => import("./pages/Profile"));
const Measurements = lazy(() => import("./pages/Measurements"));
const Programs = lazy(() => import("./pages/Programs"));
const MonthlyReport = lazy(() => import("./pages/MonthlyReport"));
const MeasurementsReport = lazy(() => import("./pages/MeasurementsReport"));
const SessionCalendar = lazy(() => import("./pages/SessionCalendar"));
const Auth = lazy(() => import("./pages/Auth"));
const Fatigue = lazy(() => import("./pages/Fatigue"));
const Coach = lazy(() => import("./pages/Coach"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

function ThemeAndFontApplier() {
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const prefs = getAIPreferences(profile?.preferences);

  useEffect(() => {
    const html = document.documentElement;
    // Apply font size
    html.classList.toggle('font-large', prefs.font_size === 'large');
    // Apply theme
    const themeClasses = ['theme-dark-orange', 'theme-dark-blue', 'theme-dark-green', 'theme-dark-purple', 'theme-dark-red'];
    themeClasses.forEach(c => html.classList.remove(c));
    if (prefs.theme && prefs.theme !== 'dark-orange') {
      html.classList.add(`theme-${prefs.theme}`);
    }
  }, [prefs.font_size, prefs.theme]);

  return null;
}

const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <div className="min-h-screen pb-14 w-full overflow-x-hidden">
      <ThemeAndFontApplier />
      {children}
      <BottomNav />
    </div>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<ProtectedPage><Index /></ProtectedPage>} />
              <Route path="/exercises" element={<ProtectedPage><Exercises /></ProtectedPage>} />
              <Route path="/routines" element={<ProtectedPage><Routines /></ProtectedPage>} />
              <Route path="/routines/:id" element={<ProtectedPage><RoutineDetail /></ProtectedPage>} />
              <Route path="/session/new" element={<ProtectedPage><NewSession /></ProtectedPage>} />
              <Route path="/session/:id" element={<ProtectedPage><SessionDetail /></ProtectedPage>} />
              <Route path="/analysis" element={<ProtectedPage><Analysis /></ProtectedPage>} />
              <Route path="/measurements" element={<ProtectedPage><Measurements /></ProtectedPage>} />
              <Route path="/programs" element={<ProtectedPage><Programs /></ProtectedPage>} />
              <Route path="/report" element={<ProtectedPage><MonthlyReport /></ProtectedPage>} />
              <Route path="/measurements-report" element={<ProtectedPage><MeasurementsReport /></ProtectedPage>} />
              <Route path="/calendar" element={<ProtectedPage><SessionCalendar /></ProtectedPage>} />
              <Route path="/profile" element={<ProtectedPage><Profile /></ProtectedPage>} />
              <Route path="/fatigue" element={<ProtectedPage><Fatigue /></ProtectedPage>} />
              <Route path="/coach" element={<ProtectedPage><Coach /></ProtectedPage>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
