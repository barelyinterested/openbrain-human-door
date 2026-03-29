import type { Express } from "express";
import type { Server } from "http";
import { insertThoughtSchema, updateThoughtSchema } from "@shared/schema";
import { requireAuth, getCurrentUser } from "./auth";

const SUPABASE_URL = "https://pqlbnvefkqbfwinfszbf.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

function supabaseHeaders() {
  return {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };
}

export function registerRoutes(httpServer: Server, app: Express) {
  // All /api/* routes require authentication
  app.use("/api", requireAuth);

  // GET all thoughts
  app.get("/api/thoughts", async (req, res) => {
    try {
      const { search, category, type } = req.query;
      const user = getCurrentUser(req);
      if (!user) return res.status(401).json({ error: "Not authenticated" });

      let url = `${SUPABASE_URL}/rest/v1/thoughts?select=id,content,metadata,created_at,updated_at&order=created_at.desc`;

      const resp = await fetch(url, { headers: supabaseHeaders() });
      if (!resp.ok) {
        const err = await resp.text();
        return res.status(resp.status).json({ error: err });
      }
      let data = await resp.json();

      // user_id lives inside metadata (metadata->>'user_id' in Postgres).
      // Show user's own thoughts OR shared thoughts.
      data = data.filter((t: any) =>
        t.metadata?.user_id === user.user_id ||
        t.metadata?.user_id === "shared" ||
        t.metadata?.shared === true
      );

      // Filter in JS (simpler than Supabase JSON filtering for complex cases)
      if (search && typeof search === "string" && search.trim()) {
        const q = search.toLowerCase();
        data = data.filter((t: any) =>
          t.content.toLowerCase().includes(q) ||
          (t.metadata?.topics || []).some((topic: string) => topic.toLowerCase().includes(q)) ||
          (t.metadata?.people || []).some((p: string) => p.toLowerCase().includes(q))
        );
      }

      if (type && typeof type === "string") {
        data = data.filter((t: any) => t.metadata?.type === type);
      }

      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET single thought
  app.get("/api/thoughts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const url = `${SUPABASE_URL}/rest/v1/thoughts?id=eq.${id}&select=id,content,metadata,created_at,updated_at`;
      const resp = await fetch(url, { headers: supabaseHeaders() });
      if (!resp.ok) return res.status(resp.status).json({ error: await resp.text() });
      const data = await resp.json();
      if (!data.length) return res.status(404).json({ error: "Not found" });
      res.json(data[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST create thought
  app.post("/api/thoughts", async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) return res.status(401).json({ error: "Not authenticated" });

      const parsed = insertThoughtSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      const url = `${SUPABASE_URL}/rest/v1/thoughts`;
      const resp = await fetch(url, {
        method: "POST",
        headers: supabaseHeaders(),
        body: JSON.stringify({ ...parsed.data, user_id: user.user_id }),
      });
      if (!resp.ok) return res.status(resp.status).json({ error: await resp.text() });
      const data = await resp.json();
      res.status(201).json(Array.isArray(data) ? data[0] : data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // PATCH update thought
  app.patch("/api/thoughts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const parsed = updateThoughtSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      const url = `${SUPABASE_URL}/rest/v1/thoughts?id=eq.${id}`;
      const resp = await fetch(url, {
        method: "PATCH",
        headers: supabaseHeaders(),
        body: JSON.stringify(parsed.data),
      });
      if (!resp.ok) return res.status(resp.status).json({ error: await resp.text() });
      const data = await resp.json();
      res.json(Array.isArray(data) ? data[0] : data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // DELETE thought
  app.delete("/api/thoughts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const url = `${SUPABASE_URL}/rest/v1/thoughts?id=eq.${id}`;
      const resp = await fetch(url, {
        method: "DELETE",
        headers: supabaseHeaders(),
      });
      if (!resp.ok) return res.status(resp.status).json({ error: await resp.text() });
      res.status(204).send();
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET stats summary
  app.get("/api/stats", async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) return res.status(401).json({ error: "Not authenticated" });

      const url = `${SUPABASE_URL}/rest/v1/thoughts?select=metadata,created_at`;
      const resp = await fetch(url, { headers: supabaseHeaders() });
      if (!resp.ok) return res.status(resp.status).json({ error: await resp.text() });
      const allData = await resp.json();

      const data = allData.filter((t: any) =>
        t.metadata?.user_id === user.user_id ||
        t.metadata?.user_id === "shared" ||
        t.metadata?.shared === true
      );

      const types: Record<string, number> = {};
      const sources: Record<string, number> = {};
      let totalTopics = 0;
      let totalPeople = 0;
      let totalActionItems = 0;

      for (const t of data) {
        const m = t.metadata || {};
        types[m.type || "unknown"] = (types[m.type || "unknown"] || 0) + 1;
        sources[m.source || "unknown"] = (sources[m.source || "unknown"] || 0) + 1;
        totalTopics += (m.topics || []).length;
        totalPeople += (m.people || []).length;
        totalActionItems += (m.action_items || []).length;
      }

      res.json({
        total: data.length,
        types,
        sources,
        totalTopics,
        totalPeople,
        totalActionItems,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
