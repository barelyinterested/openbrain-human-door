import { Link } from "wouter";
import type { Thought } from "@shared/schema";
import { inferCategory, CATEGORIES } from "@shared/schema";
import { Heart, Users, Briefcase, Settings, BookOpen, Flame, Cpu, Lightbulb, Calendar, Tag } from "lucide-react";

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

const TYPE_LABELS: Record<string, string> = {
  observation: "obs",
  reference: "ref",
  task: "task",
  idea: "idea",
};

interface ThoughtCardProps {
  thought: Thought;
  /** If true, hide the category badge (e.g. when already inside a category view) */
  hideCategoryBadge?: boolean;
}

export default function ThoughtCard({ thought, hideCategoryBadge }: ThoughtCardProps) {
  const category = inferCategory(thought);
  const catInfo = CATEGORIES[category];
  const Icon = CATEGORY_ICONS[category] || BookOpen;
  const hasActionItems = (thought.metadata.action_items?.length || 0) > 0;
  const hasDates = (thought.metadata.dates_mentioned?.length || 0) > 0;
  // Show up to 3 people as bubbles
  const people = thought.metadata.people?.slice(0, 3) || [];

  const createdDate = new Date(thought.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <Link href={`/thought/${thought.id}`}>
      <div
        data-testid={`thought-card-${thought.id}`}
        className="bg-card border border-card-border rounded-lg p-3 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group h-full flex flex-col gap-2"
      >
        {/* Header row: category badge + people bubbles + type label */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {!hideCategoryBadge && (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border cat-${category}`}>
              <Icon className="w-3 h-3" />
              {catInfo.label}
            </span>
          )}
          {people.map(p => (
            <span key={p} className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              {p}
            </span>
          ))}
          {thought.metadata.type && (
            <span className="text-xs text-muted-foreground ml-auto">
              {TYPE_LABELS[thought.metadata.type] || thought.metadata.type}
            </span>
          )}
        </div>

        {/* Content preview */}
        <p className="text-sm text-foreground line-clamp-3 flex-1 leading-snug">
          {thought.content.replace(/#+\s*/g, "").replace(/\*\*/g, "").trim()}
        </p>

        {/* Footer */}
        <div className="flex items-center gap-2 mt-auto pt-1 border-t border-border/50">
          <span className="text-xs text-muted-foreground">{createdDate}</span>
          {hasActionItems && <Tag className="w-3 h-3 text-primary ml-auto shrink-0" />}
          {hasDates && <Calendar className="w-3 h-3 text-primary shrink-0" />}
        </div>
      </div>
    </Link>
  );
}
