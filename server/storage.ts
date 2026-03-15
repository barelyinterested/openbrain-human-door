// Storage is not used — all data lives in Supabase, accessed via routes.ts
export interface IStorage {}
export class MemStorage implements IStorage {}
export const storage = new MemStorage();
