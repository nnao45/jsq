# REPL File Mode Debugging Summary

## Issues Identified and Fixed

### 1. Worker Process Path Issue
**Problem**: The worker file path was incorrect - it was looking for `repl-file-worker.js` in the wrong directory.
**Fix**: Changed the path from `join(__dirname, 'repl-file-worker.js')` to `join(__dirname, '../repl-file-worker.js')` because the compiled structure puts worker files in the dist root, not in subdirectories.

### 2. Lack of Debug Visibility
**Problem**: No way to see what was happening during worker spawn, file communication, and evaluation.
**Fixes Added**:
- Debug logging in `ReplFileCommunicator.start()` to show worker spawn details
- Worker process error and exit event handlers with debug output
- File operation debug logs (create, watch, write)
- Worker-side debug logs to track file watching and request processing

### 3. Signal Handling for Ctrl+C
**Problem**: Ctrl+C might not work properly in all terminal environments.
**Fixes Added**:
- Added SIGINT handler as a fallback for when raw mode is not available
- Added debug logging for cleanup operations
- Ensured proper cleanup of both Piscina and FileCommunicator

## Debug Output Points

### Main Process (ReplFileCommunicator):
1. `[DEBUG] Spawning worker: <path> with ID: <id>` - When worker starts
2. `[DEBUG] Worker process error: <error>` - If worker fails to start
3. `[DEBUG] Worker process exited with code <code> and signal <signal>` - When worker exits
4. `[DEBUG] Creating output file: <path>` - When output file is created
5. `[DEBUG] Starting file watcher for: <path>` - When file watching begins
6. `[DEBUG] File change detected: <type>` - When output file changes
7. `[DEBUG] Writing request to: <path>` - When sending request to worker

### Worker Process:
1. `[WORKER DEBUG] Started with ID: <id>` - Worker startup
2. `[WORKER DEBUG] Input file: <path>` - Shows input file path
3. `[WORKER DEBUG] Output file: <path>` - Shows output file path
4. `[WORKER DEBUG] Starting main function` - Main function start
5. `[WORKER DEBUG] Creating input file` - Input file creation
6. `[WORKER DEBUG] Starting file watcher` - File watcher initialization
7. `[WORKER DEBUG] Watcher event: <type>` - File change events
8. `[WORKER DEBUG] File change detected, reading input...` - Processing start
9. `[WORKER DEBUG] Processing request: <expression>` - Shows expression being evaluated
10. `[WORKER DEBUG] Writing response to output file` - Response write
11. `[WORKER DEBUG] Error in handleFileChange: <error>` - Any errors

### REPL Handler:
1. `[DEBUG] Ctrl+C detected, cleaning up...` - When Ctrl+C is pressed
2. `[DEBUG] SIGINT received, cleaning up...` - When SIGINT signal is received

## Testing

Run the test script to see debug output:
```bash
./test-repl-debug.sh
```

Or manually:
```bash
echo '{"test": 123}' | node dist/index.js --repl-file-mode
```

## Common Issues to Check

1. **Worker not starting**: Check the debug output for worker spawn errors
2. **No real-time evaluation**: Check if file change events are being detected
3. **Ctrl+C not working**: Check if SIGINT handler is being triggered
4. **File permission issues**: Check `/tmp` directory permissions
5. **Path resolution**: Verify the worker file exists at the expected path

## Next Steps

If issues persist after these fixes:
1. Check if the `/tmp` directory is accessible and writable
2. Verify that file watching works on your system (some filesystems don't support it well)
3. Try running with elevated permissions if file operations fail
4. Check system logs for any security restrictions on spawning processes