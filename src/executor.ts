import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { ExecResult } from "./schemas.js";

const execAsync = promisify(exec);

export interface ExecOptions {
  timeout_ms: number;
  max_buffer_mb: number;
  cwd?: string | null;
}

export async function executeCommand(
  command: string,
  opts: ExecOptions,
): Promise<ExecResult> {
  const startTime = Date.now();
  const maxBuffer = opts.max_buffer_mb * 1024 * 1024;

  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: opts.timeout_ms,
      maxBuffer,
      shell: "/bin/sh",
      cwd: opts.cwd ?? undefined,
    });
    return {
      success: true,
      stdout: stdout ?? "",
      stderr: stderr ?? "",
      exitCode: 0,
      duration_ms: Date.now() - startTime,
    };
  } catch (error: unknown) {
    const err = error as {
      stdout?: string;
      stderr?: string;
      code?: number;
    };
    return {
      success: false,
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? "",
      exitCode: err.code ?? 1,
      duration_ms: Date.now() - startTime,
    };
  }
}
