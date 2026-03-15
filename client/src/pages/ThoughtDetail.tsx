import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useRoute } from "wouter";
import type { Thought } from "@shared/schema";
import { inferCategory, CATEGORIES } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Edit2, Check, X, Trash2, Calendar, Tag, User, Clock } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "@/lib/navigation";

export default function ThoughtDetail() {
  const [, params] = useRoute("/thought/:id");
  const id = params?.id;
  const { toast } = useToast();
  const { navigate } = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  const { data: thought, isLoading } = useQuery<Thought>({
    queryKey: ["/api/thoughts", id],
    queryFn: () => apiRequest("GET", `/api/thoughts/${id}`).then(r => r.json()),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest("PATCH", `/api/thoughts/${id}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/thoughts"] });
      setIsEditing(false);
      toast({ title: "Updated", description: "Thought saved to your brain." });
    },
    onError: () => {
      toast({ title: "Error", description: "Couldn't save changes.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/thoughts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/thoughts"] });
      toast({ title: "Deleted", description: "Thought removed." });
      navigate("/");
    },
    onError: () => {
      toast({ title: "Error", description: "Couldn't delete.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-32 rounded" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    );
  }

  if (!thought) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Thought not found. <Link href="/" className="text-primary hover:underline">Go back</Link>
      </div>
    );
  }

  const category = inferCategory(thought);
  const catInfo = CATEGORIES[category];
  const createdDate = new Date(thought.created_at).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
  const updatedDate = new Date(thought.updated_at).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
  });

  const startEdit = () => {
    setEditContent(thought.content);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditContent("");
  };

  const saveEdit = () => {
    if (editContent.trim()) {
      updateMutation.mutate(editContent.trim());
    }
  };

  const handleDelete = () => {
    if (window.confirm("Delete this thought? This cannot be undone.")) {
      deleteMutation.mutate();
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      {/* Nav bar */}
      <div className="flex items-center gap-2">
        <Link href="/">
          <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </Link>
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium cat-${category}`}>
          {catInfo.label}
        </span>
        {thought.metadata.type && (
          <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md capitalize">
            {thought.metadata.type}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {!isEditing ? (
            <>
              <button
                data-testid="button-edit"
                onClick={startEdit}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                data-testid="button-delete"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                data-testid="button-save"
                onClick={saveEdit}
                disabled={updateMutation.isPending}
                className="p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                data-testid="button-cancel-edit"
                onClick={cancelEdit}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        {isEditing ? (
          <textarea
            data-testid="textarea-edit-content"
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            className="w-full min-h-[200px] bg-transparent text-sm text-foreground resize-none focus:outline-none leading-relaxed"
            autoFocus
          />
        ) : (
          <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
            {thought.content}
          </pre>
        )}
      </div>

      {/* Metadata */}
      <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Metadata</h3>

        {/* Timestamps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs">Created {createdDate}</span>
          </div>
          {thought.updated_at !== thought.created_at && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs">Updated {updatedDate}</span>
            </div>
          )}
        </div>

        {/* Topics */}
        {(thought.metadata.topics?.length || 0) > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1.5">Topics</div>
            <div className="flex flex-wrap gap-1.5">
              {thought.metadata.topics!.map(t => (
                <span key={t} className="text-xs bg-muted px-2 py-1 rounded-md text-foreground">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* People */}
        {(thought.metadata.people?.length || 0) > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1.5">People</div>
            <div className="flex flex-wrap gap-1.5">
              {thought.metadata.people!.map(p => (
                <span key={p} className="text-xs bg-muted px-2 py-1 rounded-md text-foreground flex items-center gap-1">
                  <User className="w-2.5 h-2.5" />
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action items */}
        {(thought.metadata.action_items?.length || 0) > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3 h-3" />
              Action Items
            </div>
            <ul className="space-y-1">
              {thought.metadata.action_items!.map((item, i) => (
                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Dates mentioned */}
        {(thought.metadata.dates_mentioned?.length || 0) > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1.5">Dates Referenced</div>
            <div className="flex flex-wrap gap-1.5">
              {thought.metadata.dates_mentioned!.map(d => (
                <span key={d} className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-md">
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Source */}
        {thought.metadata.source && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
            <span>Source:</span>
            <span className="capitalize bg-muted px-1.5 py-0.5 rounded text-foreground">
              {thought.metadata.source}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
