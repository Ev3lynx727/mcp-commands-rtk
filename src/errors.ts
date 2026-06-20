import type { ErrorCategory } from "./schemas.js";

const ERROR_PATTERNS: Array<{ category: ErrorCategory; patterns: string[] }> = [
  { category: "permission_error", patterns: ["permission denied", "eacces"] },
  { category: "not_found", patterns: ["not found", "enoent"] },
  { category: "timeout", patterns: ["timeout"] },
  { category: "syntax_error", patterns: ["syntax error", "parse error"] },
  { category: "network_error", patterns: ["connection", "network"] },
  { category: "memory_error", patterns: ["memory", "oom"] },
];

export function categorizeError(
  exitCode: number,
  stderr: string,
  stdout: string,
): ErrorCategory | null {
  if (exitCode === 0) return null;
  const combined = (stderr + stdout).toLowerCase();
  for (const { category, patterns } of ERROR_PATTERNS) {
    if (patterns.some((p) => combined.includes(p))) return category;
  }
  return "unknown_error";
}
