import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import type { CacheEntry, CacheStore } from "./schemas.js";

export class CommandCache {
  private cache: Map<string, CacheEntry> = new Map();
  hits = 0;
  misses = 0;
  private dirty = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly filePath: string;
  private readonly debounceMs: number;

  constructor(filePath: string, debounceMs = 2000) {
    this.filePath = filePath;
    this.debounceMs = debounceMs;
    this.load();
  }

  private load(): void {
    try {
      if (!existsSync(this.filePath)) return;
      const data = JSON.parse(readFileSync(this.filePath, "utf8")) as CacheStore;
      if (data.cache && data.stats) {
        this.cache = new Map(Object.entries(data.cache));
        this.hits = data.stats.hits;
        this.misses = data.stats.misses;
      }
    } catch {
      console.error("Cache corrupted, starting fresh");
    }
  }

  private debouncedSave(): void {
    this.dirty = true;
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveSync();
      this.saveTimer = null;
    }, this.debounceMs);
  }

  private saveSync(): void {
    if (!this.dirty) return;
    try {
      const store: CacheStore = {
        cache: Object.fromEntries(this.cache),
        stats: { hits: this.hits, misses: this.misses },
      };
      writeFileSync(this.filePath, JSON.stringify(store));
      this.dirty = false;
    } catch {
      // best-effort disk write
    }
  }

  hash(command: string, cwd?: string | null): string {
    return createHash("sha256")
      .update(`${command}:${cwd ?? "default"}`)
      .digest("hex")
      .slice(0, 16);
  }

  get(key: string): CacheEntry | undefined {
    return this.cache.get(key);
  }

  set(key: string, entry: CacheEntry): void {
    this.cache.set(key, entry);
    this.debouncedSave();
  }

  recordHit(): void {
    this.hits++;
    this.debouncedSave();
  }

  recordMiss(): void {
    this.misses++;
    this.debouncedSave();
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.dirty = true;
    this.saveSync();
  }

  entries(): Array<{ key: string; command: string; timestamp: number }> {
    return Array.from(this.cache.entries()).map(([k, v]) => ({
      key: k,
      command: v.command,
      timestamp: v.timestamp,
    }));
  }

  flush(): void {
    this.dirty = true;
    this.saveSync();
  }

  stats() {
    return { hits: this.hits, misses: this.misses };
  }
}
