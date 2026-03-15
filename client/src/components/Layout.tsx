import { Link, useLocation } from "wouter";
import { useTheme } from "@/components/ThemeProvider";
import { Sun, Moon, Plus, Search, LayoutDashboard } from "lucide-react";
import { useState } from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { theme, toggle } = useTheme();
  const [location, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-sidebar shrink-0 z-10">
        <Link href="/" className="flex items-center gap-2 mr-2 no-underline">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-label="OpenBrain" className="text-primary">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="2.5" fill="currentColor"/>
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="text-sm font-semibold hidden sm:block text-foreground">OpenBrain</span>
        </Link>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              data-testid="input-search"
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search your brain..."
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
            />
          </div>
        </form>

        <div className="flex items-center gap-1 ml-auto">
          <Link href="/add">
            <button
              data-testid="button-add-thought"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:block">Add</span>
            </button>
          </Link>
          <button
            data-testid="button-theme-toggle"
            onClick={toggle}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden flex border-t border-border bg-sidebar">
        <Link href="/" className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${location === "/" ? "text-primary" : "text-muted-foreground"}`}>
          <LayoutDashboard className="w-5 h-5" />
          <span>Home</span>
        </Link>
        <Link href="/add" className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${location === "/add" ? "text-primary" : "text-muted-foreground"}`}>
          <Plus className="w-5 h-5" />
          <span>Add</span>
        </Link>
      </nav>
    </div>
  );
}
