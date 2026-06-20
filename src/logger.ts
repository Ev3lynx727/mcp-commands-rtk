import { appendFileSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import type { ExecutionLogEntry } from "./schemas.js";

export class ExecutionLogger {
  private readonly filePath: string;
  private readonly maxEntries: number;

  constructor(filePath: string, maxEntries: number) {
    this.filePath = filePath;
    this.maxEntries = maxEntries;
    this.trimHead();
  }

  private trimHead(): void {
    try {
      if (!existsSync(this.filePath)) return;
      const lines = readFileSync(this.filePath, "utf8")
        .split("\n")
        .filter(Boolean);
      if (lines.length > this.maxEntries) {
        writeFileSync(
          this.filePath,
          lines.slice(-this.maxEntries).join("\n") + "\n",
        );
      }
    } catch {
      // best-effort trim
    }
  }

  append(entry: ExecutionLogEntry): void {
    try {
      appendFileSync(this.filePath, JSON.stringify(entry) + "\n");
    } catch {
      // best-effort append
    }
  }

  read(limit: number = 100): ExecutionLogEntry[] {
    try {
      if (!existsSync(this.filePath)) return [];
      const lines = readFileSync(this.filePath, "utf8")
        .split("\n")
        .filter(Boolean);
      return lines.slice(-limit).map((l) => JSON.parse(l));
    } catch {
      return [];
    }
  }
}
