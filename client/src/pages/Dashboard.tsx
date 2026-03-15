import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import type { Thought } from "@shared/schema";
import { inferCategory, getAlerts, CATEGORIES } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, AlertCircle, Info, Heart, Users, Briefcase, Settings, BookOpen, Flame, Cpu, Lightbulb, Clock, Tag, X } from "lucide-react";
import ThoughtCard from "@/components/ThoughtCard";
import { useSearch } from "@/lib/searchContext";
import { useState } from "react";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  health: Heart,
  people: Users,
  business: Briefcase,
  operations: Settings,
  reference: BookOpen,
  scentsy: Flame,
  tech: Cpu,
  ideas: Lightbulb,
};

export default function Dashboard() {
  const { query: searchQuery, setQuery } = useSearch();
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<number>>(new Set());

  const { data: thoughts, isLoading } = useQuery<Thought[]>({
    queryKey: ["/api/thoughts", searchQuery],
    queryFn: () => {
      const url = searchQuery ? `/api/thoughts?search=${encodeURIComponent(searchQuery)}` : "/api/thoughts";
      return apiRequest("GET", url).then(r => r.json());
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: () => apiRequest("GET", "/api/stats").then(r => r.json()),
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 max-w-5xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
      </div>
    );
  }

  const allThoughts = thoughts || [];
  const alerts = getAlerts(allThoughts).filter((_, i) => !dismissedAlerts.has(i));

  const byCategory = allThoughts.reduce<Record<string, Thought[]>>((acc, t) => {
    const cat = inferCategory(t);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  const recentThoughts = [...allThoughts].slice(0, 6);

  const dismissAlert = (globalIndex: number) => {
    setDismissedAlerts(prev => new Set([...prev, globalIndex]));
  };

  return (
    <div className="p-4 space-y-6 max-w-5xl mx-auto">

      {/* Search result header */}
      {searchQuery && (
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            {allThoughts.length} result{allThoughts.length !== 1 ? "s" : ""} for <span className="text-foreground">"{searchQuery}"</span>
          </h2>
          <button onClick={() => setQuery("")} className="text-xs text-primary hover:underline">Clear</button>
        </div>
      )}

      {/* Alerts strip */}
      {alerts.length > 0 && !searchQuery && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Alerts</h2>
          <div className="space-y-2">
            {getAlerts(allThoughts).map((alert, i) => {
              if (dismissedAlerts.has(i)) return null;
              const Icon = alert.level === "critical" ? AlertCircle : alert.level === "warning" ? AlertTriangle : Info;
              const cls = alert.level === "critical" ? "alert-critical" : alert.level === "warning" ? "alert-warning" : "alert-info";
              return (
                <div key={i} data-testid={`alert-item-${i}`} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-sm ${cls}`}>
                  <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                  <Link href={`/thought/${alert.thought.id}`} className="flex-1 line-clamp-2 cursor-pointer hover:opacity-80">
                    {alert.message}
                  </Link>
                  <button
                    onClick={() => dismissAlert(i)}
                    aria-label="Dismiss alert"
                    className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Stats row */}
      {stats && !searchQuery && (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Thoughts", value: stats.total, icon: Brain },
            { label: "Action Items", value: stats.totalActionItems, icon: Tag },
            { label: "People", value: stats.totalPeople, icon: Users },
            { label: "Topics", value: stats.totalTopics, icon: BookOpen },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} data-testid={`stat-${label.toLowerCase().replace(" ", "-")}`} className="bg-card border border-card-border rounded-lg p-3 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{label}</span>
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground tabular-nums">{value}</span>
            </div>
          ))}
        </section>
      )}

      {/* Search results */}
      {searchQuery && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {allThoughts.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
              No results found for "{searchQuery}"
            </div>
          ) : (
            allThoughts.map(t => <ThoughtCard key={t.id} thought={t} />)
          )}
        </div>
      )}

      {/* Categories + Recent */}
      {!searchQuery && (
        <>
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Categories</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(CATEGORIES) as Array<keyof typeof CATEGORIES>).map(key => {
                const cat = CATEGORIES[key];
                const count = (byCategory[key] || []).length;
                const Icon = CATEGORY_ICONS[key] || BookOpen;
                if (count === 0) return null;
                return (
                  <Link key={key} href={`/category/${key}`}>
                    <div
                      data-testid={`category-tile-${key}`}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity cat-${key}`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{cat.label}</div>
                        <div className="text-xs opacity-70">{count} entr{count === 1 ? "y" : "ies"}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Recent
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentThoughts.map(t => <ThoughtCard key={t.id} thought={t} />)}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Brain(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10"/>
      <path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/>
    </svg>
  );
}
