import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link, useRoute } from "wouter";
import type { Thought } from "@shared/schema";
import { inferCategory, CATEGORIES, type CategoryKey } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Heart, Users, Briefcase, Settings, BookOpen, Flame, Cpu, Lightbulb } from "lucide-react";
import ThoughtCard from "@/components/ThoughtCard";

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

export default function CategoryView() {
  const [, params] = useRoute("/category/:key");
  const key = params?.key as CategoryKey;

  const { data: thoughts, isLoading } = useQuery<Thought[]>({
    queryKey: ["/api/thoughts"],
    queryFn: () => apiRequest("GET", "/api/thoughts").then(r => r.json()),
  });

  const cat = CATEGORIES[key];
  const Icon = CATEGORY_ICONS[key] || BookOpen;

  const filtered = (thoughts || []).filter(t => inferCategory(t) === key);

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/">
          <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </Link>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cat-${key}`}>
          <Icon className="w-4 h-4" />
          <span className="font-semibold text-sm">{cat?.label || key}</span>
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} entr{filtered.length === 1 ? "y" : "ies"}</span>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36 rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No entries in this category yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(t => <ThoughtCard key={t.id} thought={t} />)}
        </div>
      )}
    </div>
  );
}
