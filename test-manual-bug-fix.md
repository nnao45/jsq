# Manual Test Instructions for Enter Newline Bug Fix

## Test Case 1: Basic Bug Fix Test

1. Start jsq in prompts mode:
   ```
   echo '{}' | node dist/index.js --prompts
   ```

2. Type: `3 * 15` and press Enter
   - Expected: Shows `→ 45`

3. Press Enter again (empty line)
   - Expected: Shows new prompt

4. Type: `$` 
   - Expected: Shows `→ null` or nothing (NOT `→ 45`)

## Test Case 2: With JSON Data

1. Start jsq with sample data:
   ```
   echo '{"name": "John", "age": 30}' | node dist/index.js --prompts
   ```

2. Type: `$.age` and press Enter
   - Expected: Shows `→ 30`

3. Press Enter again (empty line)

4. Type: `$`
   - Expected: Shows `→ null` (NOT `→ 30`)

## Test Case 3: Multiple Evaluations

1. Start jsq:
   ```
   echo '{}' | node dist/index.js --prompts
   ```

2. Type: `"Hello"` and press Enter
   - Expected: Shows `→ "Hello"`

3. Press Enter (empty line)

4. Type: `123` and press Enter
   - Expected: Shows `→ 123`

5. Press Enter (empty line)

6. Type: `$`
   - Expected: Shows `→ null` (NOT `→ 123` or `→ "Hello"`)

## What was fixed:

1. In `prompts-repl-manager.ts`: Added `this.currentData = null` when an empty line is entered
2. In `evaluator.ts`: Changed the condition for `$` evaluation to always return the current data, not just when data is null/undefined

This ensures that after pressing Enter on an empty line, the current data context is reset, preventing previous evaluation results from appearing when typing `$` on a new line.