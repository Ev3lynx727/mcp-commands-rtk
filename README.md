# server-commands-rtk

MCP server with RTK (Rust Token Killer) auto-filtering, persistent caching, and enhanced execution logging for shell commands.

## Features

- **Auto-RTK**: Automatically wraps commands with `rtk` for ~90% token reduction
- **Persistent Cache**: Results cached in `.command-cache.json` across sessions
- **Enhanced Execution Log**: Full stdout/stderr in `.execution-log.json` (single source of truth for training data)
- **Configurable Settings**: Timeout, buffer size, and log rotation via `rtk-hook.toml`
- **Token Savings**: Dramatically reduces LLM token consumption
- **Graceful Shutdown**: Proper cache flush on SIGTERM/SIGINT

## Installation

```bash
# Install RTK first (if not already)
curl -LsSf https://ev3lynx.github.io/rtk/install.sh | sh

# Or via npm
npm install -g rtk-cli

# Add to OpenCode config (~/.config/opencode/opencode.jsonc)
{
  "mcp": {
    "server-commands-rtk": {
      "type": "local",
      "command": ["node", "/path/to/server-commands-rtk/src/index.js"],
      "enabled": true,
      "timeout": 60000
    }
  }
}

# Or set alias in ~/.bashrc so it runs as a standard terminal command.

alias rtk-runner='node /home/ev3lynx/.openclaw/workspace-gh0st/server/server-commands-rtk/src/index.js'

# and run, after alias set
source ~/.bashrc

# after set alias edit config (~/.config/opencode/opencode.jsonc), with set alias
{
  "mcp": {
    "server-commands-rtk": {
      "type": "local",
      "command": ["rtk-runner"],
      "enabled": true,
      "timeout": 60000
    }
  }
}

```

## Usage

### Via MCP Tools

```javascript
// Auto-RTK (default) - commands wrapped automatically
run_process({command: "ls -la"})

// Bypass auto-RTK for raw output
run_process({command: "ls -la", use_raw: true})

// Get cache statistics
get_cache_stats()

// Clear cache
clear_command_cache()

// List cached commands
cached_commands()

// Get execution log
execution_log({limit: 100})
```

### Token Comparison

| Command | Raw Tokens | RTK Tokens | Savings |
|---------|-----------|------------|---------|
| `ls -la` | ~25,000 | ~3,000 | **88%** |
| `tree` | ~50,000 | ~5,000 | **90%** |
| `git diff` | ~15,000 | ~500 | **97%** |
| `npm install` | ~5,000 | ~200 | **96%** |

## Configuration

### RTK Hook Config (rtk-hook.toml)

```toml
[hook]
auto_wrap = true

exclude = [
  "curl",
  "wget",
  "ssh",
  "scp",
]

[rtk]
ultra_compact = false

[commands.ls]
wrapper = "rtk ls"

[execution]
timeout_ms = 60000      # Command timeout in ms
max_buffer_mb = 10      # Max output buffer in MB
max_log_entries = 1000   # Max log entries to keep
```

### Environment Variables

```bash
# Optional: custom server directory
export SERVER_DIR="/path/to/server-commands-rtk"
```

## Tools

| Tool | Description |
|------|-------------|
| `run_process` | Execute shell command with RTK auto-filtering |
| `get_cache_stats` | View cache hits/misses |
| `clear_command_cache` | Clear all cached commands |
| `cached_commands` | List all cached commands |
| `execution_log` | Get execution log (includes stdout/stderr for training data) |

## Cache Files

- `.command-cache.json` - Persistent command cache
- `.execution-log.json` - Execution audit log (last 1000 entries)

## Token Savings Example

Session with 115,267 tokens:
- Without RTK: 58% budget used
- With RTK: ~10% budget (~12K tokens)

**Expected reduction: ~90%**

## OpenCode Integration

The MCP is pre-configured for these agents:
- builder-pro
- docker-config
- deploy
- deploy-init
- deploy-prod
- deploy-verify
- deploy-monitor
- deploy-rollback

To enable globally, add `server-commands-rtk_run_process: true` to any agent's tools.

## License

MIT
