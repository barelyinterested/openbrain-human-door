import { z } from "zod";

// Represents a thought entry from Supabase
export const thoughtSchema = z.object({
  id: z.string(),
  content: z.string(),
  metadata: z.object({
    type: z.enum(["observation", "reference", "task", "idea"]).optional(),
    people: z.array(z.string()).optional().default([]),
    source: z.string().optional(),
    topics: z.array(z.string()).optional().default([]),
    action_items: z.array(z.string()).optional().default([]),
    dates_mentioned: z.array(z.string()).optional().default([]),
    slack_ts: z.string().optional(),
  }).passthrough(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const insertThoughtSchema = z.object({
  content: z.string().min(1, "Content is required"),
  metadata: z.object({
    type: z.enum(["observation", "reference", "task", "idea"]).default("observation"),
    people: z.array(z.string()).default([]),
    source: z.string().default("human-door"),
    topics: z.array(z.string()).default([]),
    action_items: z.array(z.string()).default([]),
    dates_mentioned: z.array(z.string()).default([]),
  }).default({}),
});

export const updateThoughtSchema = z.object({
  content: z.string().min(1).optional(),
  metadata: z.object({
    type: z.enum(["observation", "reference", "task", "idea"]).optional(),
    people: z.array(z.string()).optional(),
    source: z.string().optional(),
    topics: z.array(z.string()).optional(),
    action_items: z.array(z.string()).optional(),
    dates_mentioned: z.array(z.string()).optional(),
  }).passthrough().optional(),
});

export type Thought = z.infer<typeof thoughtSchema>;
export type InsertThought = z.infer<typeof insertThoughtSchema>;
export type UpdateThought = z.infer<typeof updateThoughtSchema>;

// Category mapping — derived from content analysis
export const CATEGORIES = {
  health: { label: "Health", color: "green", icon: "heart" },
  people: { label: "People", color: "blue", icon: "users" },
  business: { label: "Business", color: "orange", icon: "briefcase" },
  operations: { label: "Operations", color: "purple", icon: "settings" },
  reference: { label: "Reference", color: "yellow", icon: "book-open" },
  scentsy: { label: "Scentsy", color: "pink", icon: "flame" },
  tech: { label: "Tech", color: "cyan", icon: "cpu" },
  ideas: { label: "Ideas", color: "teal", icon: "lightbulb" },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

// Returns ALL categories this thought belongs to (can be multiple)
export function inferCategories(thought: Thought): CategoryKey[] {
  const topics = thought.metadata.topics?.map(t => t.toLowerCase()).join(" ") || "";
  const content = thought.content.toLowerCase();
  const combined = topics + " " + content;
  const cats = new Set<CategoryKey>();

  if (combined.includes("scentsy")) cats.add("scentsy");
  if (combined.includes("health") || combined.includes("cpr") || combined.includes("inhaler") ||
      combined.includes("doctor") || combined.includes("medication") || combined.includes("blood pressure") ||
      combined.includes("medical")) cats.add("health");
  // A thought belongs to People if it has people in metadata OR mentions personal/relationship keywords
  if ((thought.metadata.people?.length || 0) > 0 || combined.includes("birthday") ||
      combined.includes("anniversary") || combined.includes("family") ||
      combined.includes("relationships") || combined.includes("contacts")) cats.add("people");
  if (thought.metadata.type === "idea") cats.add("ideas");
  if (combined.includes("infrastructure") || combined.includes("cron") || combined.includes("backup") ||
      combined.includes("config") || combined.includes("deployment") || combined.includes("server") ||
      combined.includes("api") || combined.includes("systemd") || combined.includes("openclaw") ||
      combined.includes("truereall") || combined.includes("script") || combined.includes("validation")) cats.add("tech");
  if (combined.includes("business") || combined.includes("sop") || combined.includes("agency") ||
      combined.includes("local biz") || combined.includes("lead") || combined.includes("client") ||
      combined.includes("marketing") || combined.includes("sales") || combined.includes("forgefire") ||
      combined.includes("myna") || combined.includes("nexasignal") || combined.includes("localbiz") ||
      combined.includes("outreach") || combined.includes("revenue")) cats.add("business");
  if (combined.includes("soul") || combined.includes("memory") || combined.includes("agent") ||
      combined.includes("preference") || combined.includes("tool") || combined.includes("vendor") ||
      combined.includes("gmail") || combined.includes("workflow")) cats.add("operations");
  if (thought.metadata.type === "reference") cats.add("reference");

  // Fallback: if nothing matched, assign operations
  if (cats.size === 0) cats.add("operations");

  return Array.from(cats);
}

// Returns the single PRIMARY category (first matched, for backwards compat with cards/detail)
export function inferCategory(thought: Thought): CategoryKey {
  const topics = thought.metadata.topics?.map(t => t.toLowerCase()).join(" ") || "";
  const content = thought.content.toLowerCase();
  const combined = topics + " " + content;

  if (combined.includes("scentsy")) return "scentsy";
  if (combined.includes("health") || combined.includes("cpr") || combined.includes("inhaler") ||
      combined.includes("doctor") || combined.includes("medication") || combined.includes("blood pressure") ||
      combined.includes("medical")) return "health";
  if (combined.includes("birthday") || combined.includes("anniversary") || combined.includes("family") ||
      combined.includes("relationships") || combined.includes("people") || combined.includes("contacts")) return "people";
  if (thought.metadata.type === "idea") return "ideas";
  if (combined.includes("infrastructure") || combined.includes("cron") || combined.includes("backup") ||
      combined.includes("config") || combined.includes("deployment") || combined.includes("server") ||
      combined.includes("api") || combined.includes("systemd") || combined.includes("openclaw") ||
      combined.includes("truereall") || combined.includes("script") || combined.includes("validation")) return "tech";
  if (combined.includes("business") || combined.includes("sop") || combined.includes("agency") ||
      combined.includes("local biz") || combined.includes("lead") || combined.includes("client") ||
      combined.includes("marketing") || combined.includes("sales") || combined.includes("forgefire") ||
      combined.includes("myna") || combined.includes("nexasignal") || combined.includes("localbiz") ||
      combined.includes("outreach") || combined.includes("revenue")) return "business";
  if (combined.includes("soul") || combined.includes("memory") || combined.includes("agent") ||
      combined.includes("preference") || combined.includes("tool") || combined.includes("vendor") ||
      combined.includes("gmail") || combined.includes("workflow")) return "operations";
  if (thought.metadata.type === "reference") return "reference";
  return "operations";
}

export function getAlerts(thoughts: Thought[]): Array<{ thought: Thought; message: string; level: "critical" | "warning" | "info" }> {
  const now = new Date();
  const alerts: Array<{ thought: Thought; message: string; level: "critical" | "warning" | "info" }> = [];

  for (const thought of thoughts) {
    const dates = thought.metadata.dates_mentioned || [];
    for (const dateStr of dates) {
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) continue;
        // Only future or near-past dates matter for alerts
        const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= -7 && diffDays <= 30) {
          // Check if the content looks like an expiration/deadline
          const lower = thought.content.toLowerCase();
          if (lower.includes("expir") || lower.includes("due") || lower.includes("deadline") ||
              lower.includes("cert") || lower.includes("renewal") || lower.includes("backup")) {
            const level = diffDays <= 3 ? "critical" : diffDays <= 14 ? "warning" : "info";
            const when = diffDays < 0 ? `${Math.abs(diffDays)}d ago` : diffDays === 0 ? "today" : `in ${diffDays}d`;
            alerts.push({
              thought,
              message: `${thought.content.substring(0, 80)}... (${when})`,
              level
            });
          }
        }
      } catch { /* skip */ }
    }
  }

  return alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.level] - order[b.level];
  });
}
