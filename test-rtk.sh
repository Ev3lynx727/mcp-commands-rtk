#!/bin/bash
echo '{"jsonrpc":"2.0","id":"1","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
echo '{"jsonrpc":"2.0","id":"2","method":"tools/call","params":{"name":"run_process","arguments":{"command":"echo hello"}}}'
echo '{"jsonrpc":"2.0","id":"3","method":"tools/call","params":{"name":"run_process","arguments":{"command":"echo hello"}}}'
echo '{"jsonrpc":"2.0","id":"4","method":"tools/call","params":{"name":"get_cache_stats","arguments":{}}}'
