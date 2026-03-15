import { Switch, Route, Router, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "@/pages/Dashboard";
import CategoryView from "@/pages/CategoryView";
import ThoughtDetail from "@/pages/ThoughtDetail";
import AddThought from "@/pages/AddThought";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Layout from "@/components/Layout";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setTimeout(() => setLocation("/login"), 0);
    return null;
  }

  return <Component />;
}

function AppRouter() {
  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/category/:key">
          <Layout><ProtectedRoute component={CategoryView} /></Layout>
        </Route>
        <Route path="/thought/:id">
          <Layout><ProtectedRoute component={ThoughtDetail} /></Layout>
        </Route>
        <Route path="/add">
          <Layout><ProtectedRoute component={AddThought} /></Layout>
        </Route>
        <Route path="/">
          <Layout><ProtectedRoute component={Dashboard} /></Layout>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppRouter />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
