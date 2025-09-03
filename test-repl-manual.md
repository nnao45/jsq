# Manual REPL Mode Tests

## Test 1: Basic REPL File Mode

1. Build the project:
```bash
npm run build
```

2. Start REPL in file mode (in terminal):
```bash
node dist/index.js --repl-file-mode
```

3. Type expressions:
- `{}` - Should return empty object
- `{test: 123}` - Should return object with test property
- `_.range(5)` - Should return [0, 1, 2, 3, 4]

4. Check /tmp directory for worker files:
```bash
ls -la /tmp/jsq-repl-*
```

5. Exit with Ctrl+C and verify cleanup:
```bash
ls -la /tmp/jsq-repl-*  # Should show no files
```

## Test 2: REPL with Piped Input

1. Pipe JSON data and start REPL:
```bash
echo '{"message": [1,2,3], "name": "test"}' | node dist/index.js --repl
```

2. In REPL, type:
- `$.message` - Should return [1, 2, 3]
- `$.name` - Should return "test"
- `$.message.length` - Should return 3
- `$.message.map(x => x * 2)` - Should return [2, 4, 6]

3. Exit with Ctrl+C

## Test 3: REPL with Piped Input and File Mode

1. Pipe data with file mode:
```bash
echo '{"users": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]}' | node dist/index.js --repl --repl-file-mode
```

2. Test expressions:
- `$.users` - Should return the users array
- `$.users[0].name` - Should return "Alice"
- `$.users.map(u => u.name)` - Should return ["Alice", "Bob"]

## Expected Results

1. REPL should start with loaded data
2. Expressions should be evaluated correctly
3. For file mode, worker process should be spawned
4. Temporary files should be created and cleaned up properly