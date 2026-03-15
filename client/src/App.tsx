import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "@/pages/Dashboard";
import CategoryView from "@/pages/CategoryView";
import ThoughtDetail from "@/pages/ThoughtDetail";
import AddThought from "@/pages/AddThought";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import { ThemeProvider } from "@/components/ThemeProvider";

function AppRouter() {
  return (
    <Router hook={useHashLocation}>
      <Layout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/category/:key" component={CategoryView} />
          <Route path="/thought/:id" component={ThoughtDetail} />
          <Route path="/add" component={AddThought} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
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
