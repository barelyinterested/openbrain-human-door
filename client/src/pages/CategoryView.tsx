import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link, useRoute } from "wouter";
import type { Thought } from "@shared/schema";
import { inferCategories, CATEGORIES, type CategoryKey } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Heart, Users, Briefcase, Settings, BookOpen, Flame, Cpu, Lightbulb, User } from "lucide-react";
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

  // Multi-category: include any thought that belongs to this category
  const filtered = (thoughts || []).filter(t => inferCategories(t).includes(key));

  // For People: group cards by person name
  const isPeople = key === "people";

  let groupedPeople: Array<{ name: string; thoughts: Thought[] }> = [];
  let ungrouped: Thought[] = [];

  if (isPeople) {
    const byPerson: Record<string, Thought[]> = {};
    const noPersonThoughts: Thought[] = [];

    for (const t of filtered) {
      const people = t.metadata.people || [];
      if (people.length === 0) {
        noPersonThoughts.push(t);
      } else {
        for (const person of people) {
          if (!byPerson[person]) byPerson[person] = [];
          byPerson[person].push(t);
        }
      }
    }

    // Sort people alphabetically
    groupedPeople = Object.entries(byPerson)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, thoughts]) => ({ name, thoughts }));

    ungrouped = noPersonThoughts;
  }

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

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-36 rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No entries in this category yet.
        </div>
      ) : isPeople ? (
        /* People view: grouped by person */
        <div className="space-y-6">
          {groupedPeople.map(({ name, thoughts: personThoughts }) => (
            <section key={name}>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span className="text-sm font-semibold text-primary">{name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {personThoughts.length} entr{personThoughts.length === 1 ? "y" : "ies"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {personThoughts.map(t => (
                  <ThoughtCard key={t.id} thought={t} hideCategoryBadge />
                ))}
              </div>
            </section>
          ))}

          {/* Ungrouped (no people in metadata) */}
          {ungrouped.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Unassigned</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {ungrouped.length} entr{ungrouped.length === 1 ? "y" : "ies"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ungrouped.map(t => (
                  <ThoughtCard key={t.id} thought={t} hideCategoryBadge />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        /* All other categories: flat grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(t => <ThoughtCard key={t.id} thought={t} />)}
        </div>
      )}
    </div>
  );
}
