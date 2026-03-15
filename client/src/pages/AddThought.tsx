import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useState } from "react";
import { ChevronLeft, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AddThought() {
  const { toast } = useToast();
  const { navigate } = useNavigate();
  const [content, setContent] = useState("");
  const [type, setType] = useState<"observation" | "reference" | "task" | "idea">("observation");

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/thoughts", {
        content: content.trim(),
        metadata: {
          type,
          source: "human-door",
          people: [],
          topics: [],
          action_items: [],
          dates_mentioned: [],
        },
      }),
    onSuccess: async (res) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/thoughts"] });
      toast({ title: "Saved", description: "Thought added to your brain." });
      navigate(data?.id ? `/thought/${data.id}` : "/");
    },
    onError: () => {
      toast({ title: "Error", description: "Couldn't save thought.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) createMutation.mutate();
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      {/* Nav */}
      <div className="flex items-center gap-2">
        <Link href="/">
          <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </Link>
        <h1 className="text-base font-semibold text-foreground">Add a Thought</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-card border border-card-border rounded-xl p-4 space-y-4">
          {/* Content */}
          <div className="space-y-1.5">
            <Label htmlFor="content" className="text-xs text-muted-foreground">
              What's on your mind?
            </Label>
            <Textarea
              id="content"
              data-testid="textarea-new-thought"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="My CPR cert expires on 3/22/26&#10;&#10;Carola's birthday is 4/13&#10;&#10;The living room paint is Benjamin Moore Hale Navy..."
              className="min-h-[160px] resize-none bg-muted border-muted focus:border-primary text-sm leading-relaxed"
              autoFocus
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger data-testid="select-type" className="w-40 bg-muted border-muted text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="observation">Observation</SelectItem>
                <SelectItem value="reference">Reference</SelectItem>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="idea">Idea</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 leading-relaxed">
            <strong className="text-foreground">Tip:</strong> Your agent reads this too — write naturally. Mention dates, people, topics. The AI will categorize and extract metadata automatically when it next queries your brain.
          </div>
        </div>

        <Button
          data-testid="button-save-thought"
          type="submit"
          disabled={!content.trim() || createMutation.isPending}
          className="w-full gap-2"
        >
          <Send className="w-4 h-4" />
          {createMutation.isPending ? "Saving..." : "Save to Brain"}
        </Button>
      </form>
    </div>
  );
}
