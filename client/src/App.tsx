import { StrictMode } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard";
import UsersPage from "@/pages/users-page";
import SetPasswordPage from "@/pages/set-password-page";
import ShelfSetup from "@/pages/shelf-setup";
import ProductManagement from "@/pages/products";
import Personas from "@/pages/personas";
import Questions from "@/pages/questions";
import RunSurvey from "@/pages/run-survey";
import Analysis from "@/pages/analysis";
import Survey from "@/pages/survey";
import Simulation from "@/pages/simulation";
import ConjointConfiguration from "@/pages/conjoint-configuration";
import { Layout } from "@/components/layout/layout";
import { useUser } from "@/hooks/use-user";
import { useTheme } from "@/hooks/use-theme";
import { Loader2 } from "lucide-react";

function Router() {
  const { user, isLoading } = useUser();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  // Handle password reset routes first
  if (location.startsWith('/set-password/')) {
    return <SetPasswordPage />;
  }

  // Handle public survey route
  if (location.startsWith('/survey/')) {
    return <Survey />;
  }

  // If no user is logged in, show the auth page
  if (!user) {
    return <AuthPage />;
  }

  return (
    <Layout>
      <Switch>
        {/* Default Navigation Routes */}
        <Route path="/" component={DashboardPage} />
        <Route path="/home" component={DashboardPage} />
        <Route path="/products" component={ProductManagement} />
        <Route path="/personas" component={Personas} />
        <Route path="/questions" component={Questions} />
        <Route path="/shelf-setup" component={ShelfSetup} />
        <Route path="/shelves/:id/conjoint-configuration" component={ConjointConfiguration} />
        <Route path="/run-survey" component={RunSurvey} />
        <Route path="/analysis" component={Analysis} />
        <Route path="/users" component={UsersPage} />
        <Route path="/simulation" component={Simulation} />

        {/* Password Reset Route */}
        <Route path="/set-password/:token" component={SetPasswordPage} />

        {/* Fallback Route */}
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  useTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;