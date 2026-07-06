# BENCHMARK.md — Performance Benchmarks

> Date: 2026-07-06
> Version: v0.3.0 (RTK v0.43.0, OpenCode v1.17)
> Status: Active

---

## OVERVIEW

This document tracks performance benchmarks for the `commands-rtk` MCP server, including execution latency, builtin passthrough logic, cache performance, and token reduction via RTK filtering.

**Architecture:** executor.ts prepends `rtk` to external commands (git, docker, npm, ls...) with two passthrough exceptions:
- **Shell builtins** (`cd`, `exit`, `export`, `source`, `.`, `set`, `alias`, `pushd`...) — no `rtk` prefix
- **Compound commands** (`&&`, `||`, `;`, `|`) — no `rtk` prefix (RTK can't resolve shell operators)
No subprocess overhead — string concat only.

---

## SEQUENTIAL EXECUTION LATENCY

### Test Methodology

- **Tool:** `run_process` via MCP (stdio transport)
- **Commands:** Simple `echo` statements
- **Measurement:** `duration_ms` from suite-test.ts benchmark section

### Results (from suite-test.ts benchmark — v0.3.0)

| Metric | Cache Miss | Cache Hit |
|--------|-----------|-----------|
| **Mean Latency** | ~65ms | ~4ms |
| **Speedup** | 1x | ~17x |
| **Sample Size** | 5 trials each | 5 trials each |

### Analysis

1. **Cache miss latency** (~65ms) includes: command execution, cache write
2. **Cache hit latency** (~4ms) is pure Map lookup — no I/O
3. **Speedup** of 17x makes repeated commands effectively free
4. Token savings from RTK (~60-90%) dwarf any latency difference

---

## TOKEN REDUCTION (RTK FILTERING)

### Global Statistics (from `rtk gain`)

| Metric | Value |
|--------|-------|
| **Total Commands** | 3,089 |
| **Input Tokens** | 8.2M |
| **Output Tokens** | 651.7K |
| **Tokens Saved** | 7.5M (92.0%) |
| **Total Exec Time** | 132m10s (avg 2.6s) |

### By Command Type

| Command | Count | Savings | Avg% | Notes |
|---------|-------|---------|------|-------|
| `rtk curl` (API calls) | 6 | ~6.6M | 99.4% | JSON/HTML responses compress heavily |
| `rtk find` | 51 | 190.2K | 59.1% | File listings |
| `rtk git status` | 13 | 127.4K | 63.4% | Structured output |
| `rtk tsc --noEmit` | 7 | 92.8K | 33.9% | Error/warning dense |
| `rtk read` | 15 | 76.9K | 18.5% | Dense text |
| `rtk:toml ps aux` | 31 | 114.9K | 80.6% | Process lists |

### Observations

- **High token commands** (curl, find) see 59-99% reduction
- **Dense output** (read, tsc) sees modest 18-34% reduction but still worthwhile
- **Overall 92%** savings means ~13x effective context multiplier

---

## RTK PASSTHROUGH LOGIC

executor.ts uses two guards to skip the `rtk` prefix:

| Guard | Pattern | Skip `rtk`? | Examples |
|-------|---------|-------------|----------|
| **isBuiltin** | `/^(cd\|pushd\|popd\|export\|source\|\\.\|set\|unset\|alias\|unalias\|exit\|trap\|exec\|type)($\|\s)/` | Yes | `cd /x`, `exit 42`, `export PATH=...` |
| **isCompound** | `/[;&|]/` after stripping quoted strings | Yes | `a && b`, `a \| b`, `a; b` |
| Default | All other commands | No (RTK prefixes) | `git status`, `docker ps`, `npm run` |

**RTK v0.43.0** has dedicated subcommands for 50+ tools: git, docker, npm, npx, gh, cargo, pip, go, tsc, jest, ls, find, grep, rg, curl, kubectl...

---

## CACHE PERFORMANCE

### Cache Hit/Miss Latency

| Operation | Latency | Notes |
|-----------|---------|-------|
| Cache Miss (first run) | ~65ms | Includes command execution |
| Cache Hit (subsequent) | ~4ms | Metadata lookup only |
| Cache Write | ~5-10ms | JSON serialization + debounced disk I/O |

### Cache Statistics

Run `get_cache_stats` tool to see current hits/misses:

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "get_cache_stats",
    "arguments": {}
  }
}
```

---

## CONFIGURABLE SETTINGS (rtk-hook.toml)

### Current Configuration

```toml
[execution]
timeout_ms = 60000
max_buffer_mb = 10
max_log_entries = 1000
debounce_ms = 2000

[log]
max_active_entries = 1000
max_archives = 10
compress = true
```

### Impact of Settings

| Setting | Low Value | High Value | Recommendation |
|---------|-----------|------------|----------------|
| `timeout_ms` | Fast failure | Long waits | 60000 (60s) default |
| `max_buffer_mb` | Truncated output | High memory | 10MB default |
| `max_log_entries` | Lost history | High disk usage | 1000 default |
| `debounce_ms` | More disk writes | Staler cache on crash | 2000 default |

---

## RECOMMENDATIONS

### For Production Use

1. **Monitor log size** — 1000 entries at ~3MB is safe
2. **Adjust timeout** — Increase for long-running builds/installs
3. **RTK on by default** — simple commands auto-prefixed, builtins/compound skip
4. **Use `cwd` param** — avoid `cd &&` in command strings (triggers `isCompound` guard)
5. **Clear cache** via `clear_command_cache` if stale entries accumulate

### For Training Data Export

1. **Single source** — `~/.local/share/state/commands-rtk/execution-log.jsonl` has full stdout/stderr
2. **Filter by model** — Use `model_used` field to segment

---

## TRANSPORT SECURITY

### Why stdio is used (not StreamableHTTP)

| Aspect | stdio | StreamableHTTP |
|--------|-------|----------------|
| **Network Exposure** | None (local only) | Exposed to network |
| **Authentication** | Process isolation | Requires auth |
| **Attack Surface** | Minimal | Higher |
| **Use Case** | Single-user local | Multi-user / remote |

Stdio is the default — no network exposure, no auth needed, minimal attack surface.

---

*Last Updated: 2026-07-06*
*Benchmark Tool: `commands-rtk` v0.3.0*
*OpenCode v1.17*
