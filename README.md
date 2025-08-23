# JavaScript-Powered JSON Query CLI Tool

[🇯🇵 日本語](README.ja.md) | 🇺🇸 **English**

jsq is a security-first, innovative command-line tool that allows developers to process JSON data using familiar jQuery/Lodash-like syntax. Built with VM isolation by default, it combines a beautiful real-time REPL interface with powerful data processing capabilities, making JSON manipulation both safe and intuitive.

## 🌟 Key Features

### 1. 🔗 jQuery-style Chaining API with 80+ Built-in Methods
Process JSON with intuitive syntax and comprehensive utility library including RxJS-style reactive operators - no external dependencies needed

```bash
# jq (requires learning complex syntax)
cat users.json | jq '.users[] | select(.active == true) | .name'

# jsq (intuitive with rich built-in methods)
cat users.json | jsq '$.users.filter(u => u.active).pluck("name")'

# Advanced data processing with built-in lodash-like methods
cat data.json | jsq '$.items.compact().uniqBy(i => i.id).orderBy(["priority", "date"], ["desc", "asc"])'

# Statistical analysis without external libraries
cat sales.json | jsq '$.sales.groupBy(s => s.category).entries().map(([cat, sales]) => ({category: cat, avg: _.mean(sales.map(s => s.amount))}))'

# RxJS-style reactive processing with time-based operations
echo '[1,2,3,4,5]' | jsq '$.tap(x => console.log(`Processing: ${x}`)).delay(100).map(x => x * 2)'
```

### 2. ✨ Pipeline Variable Declarations
Declare and use variables within expressions using intuitive pipeline syntax

```bash
# Simple variable declaration and usage
jsq "const message = 'hello world' | message.toUpperCase()" # "HELLO WORLD"

# Complex data transformations
cat users.json | jsq "const names = $.users.map(u => u.name) | names.join(', ')"

# Works with both const and let
jsq "let numbers = [1,2,3,4,5] | numbers.filter(x => x > 3)" # [4, 5]
```

### 3. 📁 Direct File Reading and REPL
Process files directly and explore data interactively

```bash
# Direct file reading
jsq '$.users.length' --file data.json
jsq '$.name' --file users.jsonl --stream

# Interactive REPL mode
jsq --repl --file data.json  # Real-time data exploration
```

### 4. 🔒 Secure VM Execution by Default - Security First Design
jsq prioritizes security with mandatory VM isolation for all code execution. Unlike other JavaScript-based tools, jsq runs all expressions in a secure sandbox environment by default, preventing access to the file system, network, and shell commands unless explicitly enabled.

```bash
# All executions run in secure VM isolation by default
cat data.json | jsq '$.users.filter(u => u.active)'
# 🔒 VM isolation enabled: No filesystem/network/shell access

# Configure resource limits for additional security
cat data.json | jsq --memory-limit 256 --cpu-limit 60000 '$.map(x => x.value).uniq()'
# 🔒 VM with custom resource limits: 256MB memory, 60s CPU time
```

### 5. ⚡ Multi-CPU Parallel Processing ✨ NEW
Leverage all available CPU cores for blazingly fast JSON processing - an exclusive jsq advantage over jq

```bash
# Basic parallel processing - automatically uses CPU count - 1 workers
cat large-data.jsonl | jsq --parallel '$.transform(x => x.value * 2)'

# Specify exact number of workers for optimal performance  
cat huge-dataset.jsonl | jsq --parallel 8 '$.filter(item => item.active).map(item => item.name)'

# Combine with streaming for maximum throughput on massive files
cat massive-logs.jsonl | jsq --stream --parallel '$.filter(log => log.level === "error")' 

# 20x faster than jq on multi-core systems!
time cat million-records.jsonl | jsq --parallel '$.process()'  # ~2 seconds
time cat million-records.jsonl | jq '.process()'               # ~40 seconds
```

### 6. 🚀 Optimized Performance
Lightweight and fast with minimal dependencies

### 7. 🌐 Built-in Fetch & Async/Await Support ✨ NEW
Native fetch API and async/await support for seamless HTTP requests and asynchronous operations

```bash
# Fetch API data and process it
jsq 'const response = await fetch("https://jsonplaceholder.typicode.com/posts/1"); const data = await response.json(); data.title'
# Output: "sunt aut facere repellat provident occaecati excepturi optio reprehenderit"

# Fetch multiple endpoints concurrently
jsq 'const urls = ["https://jsonplaceholder.typicode.com/posts/1", "https://jsonplaceholder.typicode.com/posts/2"]; const responses = await Promise.all(urls.map(url => fetch(url))); const data = await Promise.all(responses.map(r => r.json())); data.map(post => post.title)'

# Combine with data processing
echo '["posts/1", "posts/2", "posts/3"]' | jsq '$.map(async endpoint => { const response = await fetch(`https://jsonplaceholder.typicode.com/${endpoint}`); const data = await response.json(); return {id: data.id, title: data.title}; })'

# Error handling with async operations
jsq 'try { const response = await fetch("https://invalid-url"); const data = await response.json(); return data; } catch (error) { return {error: error.message}; }'
```

### 8. 🔗 Sequential Execution with Semicolon Operator ✨ NEW
Execute multiple expressions sequentially, returning only the final result - perfect for side effects and complex data processing

```bash
# Basic sequential execution - log and return
echo '{"value": 42}' | jsq 'console.log("Processing data..."); $.value * 2'
# Output: Processing data...
#         84

# Multiple operations with side effects
echo '{"users": [{"name": "Alice"}, {"name": "Bob"}]}' | jsq 'console.log("Found", $.users.length, "users"); $.users.map(u => u.name).join(", ")'
# Output: Found 2 users
#         "Alice, Bob"

# Complex data transformation pipeline
echo '[1,2,3,4,5]' | jsq 'const sum = _.sum($); const max = _.max($); console.log(`Sum: ${sum}, Max: ${max}`); $.length'
# Output: Sum: 15, Max: 5
#         5

# Async operations with side effects
echo '["https://jsonplaceholder.typicode.com/posts/1"]' | jsq 'console.log("Fetching data..."); const response = await fetch($[0]); const data = await response.json(); console.log("Received:", data.title.substring(0, 20) + "..."); data.id'
# Output: Fetching data...
#         Received: sunt aut facere rep...
#         1
```

### 9. ⚡ Advanced Async Array Methods ✨ NEW  
Powerful async array processing with both parallel and sequential execution modes - perfect for API calls and async operations

```bash
# Parallel async processing - fastest execution
echo '["https://jsonplaceholder.typicode.com/posts/1", "https://jsonplaceholder.typicode.com/posts/2"]' | jsq 'await $.forEachAsync(async url => { const res = await fetch(url); console.log("Processed:", url); })'

# Sequential async processing - controlled execution, perfect for rate limiting
echo '[1, 2, 3]' | jsq 'await $.forEachAsyncSeq(async id => { await new Promise(r => setTimeout(r, 100)); console.log("Processed ID:", id); })'

# Parallel async mapping - transform data with async operations  
echo '["posts/1", "posts/2", "posts/3"]' | jsq 'await $.mapAsync(async endpoint => { const res = await fetch(`https://jsonplaceholder.typicode.com/${endpoint}`); const data = await res.json(); return { id: data.id, title: data.title.substring(0, 30) + "..." }; })'

# Sequential async mapping - for operations that must be ordered
echo '[1, 2, 3]' | jsq 'await $.mapAsyncSeq(async id => { await new Promise(r => setTimeout(r, 50)); return { id, processed: true, timestamp: new Date().toISOString() }; })'

# Combine with error handling
echo '["valid-url", "invalid-url"]' | jsq 'await $.mapAsync(async url => { try { const res = await fetch(`https://jsonplaceholder.typicode.com/${url}`); return { url, status: "success", data: await res.json() }; } catch (error) { return { url, status: "error", message: error.message }; } })'
```


### 10. 🎯 Full TypeScript Support
Provides type-safe processing and excellent developer experience

### 11. 👀 Watch Mode for Real-time Data Processing ✨ NEW
Monitor file changes and automatically re-execute expressions for live data updates

```bash
# Watch JSON file and re-run expression on changes
jsq '$.users.filter(u => u.active).length' --file users.json --watch

# Monitor CSV data with real-time updates
jsq '$.filter(row => row.status === "pending")' --file tasks.csv --file-format csv --watch

# Live dashboard for YAML configuration
jsq '$.servers.map(s => ({name: s.name, status: s.health}))' --file config.yaml --file-format yaml --watch
```

Watch mode features:
- 🔄 Automatic re-execution on file changes
- 🖥️ Clear console output for each update
- ⚡ Debounced file watching (100ms) to prevent excessive updates
- 🎯 Works with all supported file formats (JSON, CSV, YAML, etc.)
- 🛑 Graceful exit with Ctrl+C

## 📦 Installation

### Node.js (npm) - Primary Installation
```bash
npm install -g @nnao45/jsq

# Use default Node.js runtime
jsq '$.users.pluck("name")' --file data.json

# Or use Bun runtime via subcommand
jsq bun '$.users.pluck("name")' --file data.json

# Or use Deno runtime via subcommand  
jsq deno '$.users.pluck("name")' --file data.json
```

### Runtime-Specific Usage

#### Bun
```bash
# After npm install, use jsq bun subcommand
jsq bun '$.users.pluck("name")' --file data.json

# Or run directly with Bun (without installation)
bun run https://github.com/nnao45/jsq/raw/main/src/simple-cli.ts '$.users.pluck("name")' --file data.json
```

#### Deno
```bash
# After npm install, use jsq deno subcommand
jsq deno '$.users.pluck("name")' --file data.json

# Or run directly with Deno (without installation)
deno run --allow-all --unstable-sloppy-imports https://github.com/nnao45/jsq/raw/main/src/simple-cli.ts '$.users.pluck("name")' --file data.json
```

### Cross-Runtime Compatibility
jsq supports running with multiple JavaScript runtimes through subcommands:
- **Node.js**: `jsq` (default)
- **Bun**: `jsq bun` (faster startup, better performance)
- **Deno**: `jsq deno` (secure by default, TypeScript native)

## ✨ Beautiful Interactive REPL

Experience real-time JSON processing with a stunning, colorful interface:

```bash
# Start the interactive REPL
jsq --repl --file data.json
```

**REPL Features:**
- 🎨 **Dynamic colorful prompt** - Each character changes color every second
- ⚡ **Real-time evaluation** - See results as you type (300ms debounce)
- 🔄 **Smart loading indicators** - Visual feedback for longer operations (500ms+)
- 📊 **Live data exploration** - Toggle data view with Ctrl+R
- 🚀 **Syntax highlighting** - Built-in expression validation
- 💡 **Auto-suggestions** - Intelligent completion hints

The REPL provides a Claude Code-style interface with:
- Multi-colored `❯❯❯` prompt that changes colors dynamically
- Fixed-position input at the bottom
- Scrollable result area that auto-truncates for optimal viewing
- Instant feedback for syntax errors and partial expressions

## 🚀 Basic Usage

### Data Transformation

```bash
# Transform each element in array
echo '{"numbers": [1, 2, 3, 4, 5]}' | jsq '$.numbers.map(n => n * 2)'
# Output: [2, 4, 6, 8, 10]

# Filter objects
echo '{"users": [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]}' | jsq '$.users.filter(u => u.age > 25)'
# Output: [{"name": "Alice", "age": 30}]

# Same operations with different runtimes
echo '{"data": [1, 2, 3]}' | jsq bun '$.data.map(x => x * 3)'        # Using Bun
echo '{"data": [1, 2, 3]}' | jsq deno '$.data.filter(x => x > 1)'    # Using Deno
```

### Chaining Operations

```bash
# Combine multiple operations
echo '{"sales": [{"product": "laptop", "price": 1200}, {"product": "mouse", "price": 25}]}' | jsq '$.sales.sortBy("price").pluck("product")'
# Output: ["mouse", "laptop"]

# Aggregation operations
echo '{"orders": [{"amount": 100}, {"amount": 250}, {"amount": 75}]}' | jsq '$.orders.sum("amount")'
# Output: 425
```

### Conditional Filtering

```bash
echo '{"products": [{"name": "iPhone", "category": "phone", "price": 999}, {"name": "MacBook", "category": "laptop", "price": 1299}]}' | jsq '$.products.where("category", "phone").pluck("name")'
# Output: ["iPhone"]
```

### Pipeline Variable Declarations ✨ NEW

Create variables and use them in the same expression with intuitive pipeline syntax:

```bash
# Basic variable pipeline with const
echo '{}' | jsq "const message = 'hello world' | message.toUpperCase()"
# Output: "HELLO WORLD"

# Using let for mutable variables
echo '{}' | jsq "let numbers = [1,2,3,4,5] | numbers.filter(x => x > 3)"
# Output: [4, 5]

# Complex data processing with jsq data
echo '{"users": [{"name": "Alice"}, {"name": "Bob"}]}' | jsq "const names = $.users.map(u => u.name) | names.join(', ')"
# Output: "Alice, Bob"

# Object manipulation
echo '{}' | jsq "const data = {a: 1, b: 2, c: 3} | Object.keys(data).length"
# Output: 3

# Method chaining with variables
echo '{}' | jsq "let text = 'The Quick Brown Fox' | text.toLowerCase().split(' ').join('-')"
# Output: "the-quick-brown-fox"

# Works seamlessly with all runtimes
echo '{}' | jsq bun "const result = [1,2,3,4,5] | result.reduce((a,b) => a+b, 0)"  # Bun
echo '{}' | jsq deno "let items = ['a','b','c'] | items.length"                     # Deno
```

## 🔧 Advanced Features


### Security Features

jsq provides secure VM isolation by default, ensuring safe execution of JavaScript expressions:

#### 🔒 Default Mode (VM Isolation)
```bash
# Secure execution with VM isolation
cat data.json | jsq '_.uniq($.tags)'
# 🔒 Running in secure VM isolation mode
```

#### 🔒 Resource Control Options
Configure VM resource limits:

```bash
# Adjust memory limit (default: 128MB)
cat data.json | jsq --memory-limit 256 '$.data.map(x => x.value)'

# Adjust CPU time limit (default: 30s)
cat data.json | jsq --cpu-limit 60000 '$.data.filter(x => x.active)'
# 🐚 Shell command execution disabled

# Disable file system access
cat data.json | jsq --no-fs '$.data.sortBy("name")'
# 📁 File system access disabled

# Combine multiple restrictions
cat data.json | jsq --no-network --no-shell --no-fs '$.data.length'
```

#### 🛡️ Legacy Sandbox Flag
The --sandbox flag is deprecated as VM isolation is now the default:

```bash
# --sandbox flag is no longer needed (VM is default)
cat data.json | jsq '_.groupBy($.items, "category")'
# 🔒 Running in secure VM isolation mode
```

#### ⚖️ Security Configuration

| Mode | Network | Shell | FileSystem | VM | Timeout | Use Case |
|------|---------|-------|------------|----|---------|---------| 
| Default (VM) | ❌ | ❌ | ❌ | ✅ | 30s | Secure execution by default |
| --memory-limit N | ❌ | ❌ | ❌ | ✅ | 30s | Custom memory limit (MB) |
| --cpu-limit N | ❌ | ❌ | ❌ | ✅ | Custom | Custom CPU time limit (ms) |
| Legacy flags | - | - | - | - | - | Deprecated, no effect |

#### 🚨 Security Warnings & Validation

jsq automatically detects and warns about security issues:

```bash
# Automatic security warnings
cat data.json | jsq --use lodash 'import("child_process")'
# ⚠️ Warning: External libraries will execute without VM isolation

# Expression validation errors
cat data.json | jsq --no-shell 'execSync("ls")'
# ❌ Security validation failed: Shell command execution is disabled
```

### Streaming Processing Demo

```bash
# Experience real-time data processing
# Note: Use double quotes for JSON and escape properly in your shell
for i in {1..3}; do echo "{\"id\":$i,\"name\":\"User$i\"}"; sleep 1; done | jsq '$.name' --stream
# Output:
# "User1"
# "User2"  (after 1 second)
# "User3"  (after another second)

# Alternative with printf for better compatibility
for i in {1..3}; do printf '{"id":%d,"name":"User%d"}\n' $i $i; sleep 1; done | jsq '$.name' --stream
```

### Performance Monitoring

```bash
# Display detailed performance information
cat large-data.json | jsq -v '$.records.filter(r => r.status === "active").length()'
# Processing time: 15ms
# Input size: 1024 bytes
# Output size: 1 bytes
```

## 📚 Available Methods

### Core Array Operations

| Method | Description | Example |
|--------|-------------|---------|
| `filter(predicate)` | Filter elements matching condition | `$.users.filter(u => u.age > 18)` |
| `map(transform)` | Transform each element | `$.numbers.map(n => n * 2)` |
| `find(predicate)` | Get first element matching condition | `$.users.find(u => u.name === "Alice")` |
| `where(key, value)` | Filter by key/value pair | `$.products.where("category", "electronics")` |
| `pluck(key)` | Extract values for specified key | `$.users.pluck("email")` |
| `sortBy(key)` | Sort by specified key | `$.items.sortBy("price")` |
| `take(count)` | Take first N elements | `$.results.take(5)` |
| `skip(count)` | Skip first N elements | `$.results.skip(10)` |

### Advanced Array Manipulation

| Method | Description | Example |
|--------|-------------|---------|
| `uniqBy(keyFn)` | Remove duplicates by key function | `$.users.uniqBy(u => u.email)` |
| `flatten()` | Flatten nested arrays by one level | `$.nested.flatten()` |
| `flattenDeep()` | Recursively flatten all nested arrays | `$.deepNested.flattenDeep()` |
| `compact()` | Remove falsy values (null, undefined, false, 0, "") | `$.mixed.compact()` |
| `chunk(size)` | Split array into chunks of specified size | `$.items.chunk(3)` |
| `takeWhile(predicate)` | Take elements while condition is true | `$.scores.takeWhile(s => s > 80)` |
| `dropWhile(predicate)` | Drop elements while condition is true | `$.scores.dropWhile(s => s < 60)` |
| `reverse()` | Reverse array order | `$.items.reverse()` |
| `shuffle()` | Randomly shuffle array elements | `$.cards.shuffle()` |
| `sample()` | Get random element from array | `$.options.sample()` |
| `sampleSize(count)` | Get N random elements from array | `$.items.sampleSize(3)` |

### Async Array Processing ✨ NEW

| Method | Description | Example |
|--------|-------------|---------|
| `forEachAsync(asyncFn)` | Execute async function for each element in parallel | `await $.urls.forEachAsync(async url => await fetch(url))` |
| `forEachAsyncSeq(asyncFn)` | Execute async function for each element sequentially | `await $.ids.forEachAsyncSeq(async id => await process(id))` |
| `mapAsync(asyncTransform)` | Transform each element with async function in parallel | `await $.endpoints.mapAsync(async url => await fetch(url).then(r => r.json()))` |
| `mapAsyncSeq(asyncTransform)` | Transform each element with async function sequentially | `await $.items.mapAsyncSeq(async item => await processInOrder(item))` |

### Advanced Sorting & Grouping

| Method | Description | Example |
|--------|-------------|---------|
| `orderBy(keys, orders)` | Multi-key sorting with direction control | `$.users.orderBy(['age', 'name'], ['desc', 'asc'])` |
| `groupBy(keyFn)` | Group elements by key function | `$.sales.groupBy(s => s.category)` |
| `countBy(keyFn)` | Count elements by key function | `$.events.countBy(e => e.type)` |
| `keyBy(keyFn)` | Create object indexed by key function | `$.users.keyBy(u => u.id)` |

### Object Manipulation

| Method | Description | Example |
|--------|-------------|---------|
| `pick(keys)` | Select only specified object keys | `$.user.pick(['name', 'email'])` |
| `omit(keys)` | Exclude specified object keys | `$.user.omit(['password', 'secret'])` |
| `invert()` | Swap object keys and values | `$.mapping.invert()` |
| `keys()` | Get object keys as array | `$.config.keys()` |
| `values()` | Get object values as array | `$.settings.values()` |
| `entries()` | Get object entries as [key, value] pairs | `$.data.entries()` |

### Collection Methods (Arrays & Objects)

| Method | Description | Example |
|--------|-------------|---------|
| `size()` | Get collection size (length for arrays, key count for objects) | `$.collection.size()` |
| `isEmpty()` | Check if collection is empty | `$.data.isEmpty()` |
| `includes(value)` | Check if collection contains value | `$.tags.includes('javascript')` |

### Statistical & Mathematical

| Method | Description | Example |
|--------|-------------|---------|
| `sum(key?)` | Calculate sum of numbers or by key | `$.orders.sum('amount')` |
| `mean()` | Calculate average of numeric array | `$.scores.mean()` |
| `min()` | Find minimum value in numeric array | `$.prices.min()` |
| `max()` | Find maximum value in numeric array | `$.prices.max()` |
| `minBy(keyFn)` | Find element with minimum key value | `$.products.minBy(p => p.price)` |
| `maxBy(keyFn)` | Find element with maximum key value | `$.products.maxBy(p => p.rating)` |

### Utility Methods (via `_` namespace)

#### Array Utilities
```bash
# Get unique values by property
echo '{"users": [{"id": 1, "name": "Alice"}, {"id": 1, "name": "Alice Clone"}]}' | jsq '_.uniqBy($.users, u => u.id)'

# Remove falsy values and flatten
echo '{"data": [1, null, [2, 3], undefined, [4, [5]]]}' | jsq '_.compact(_.flattenDeep($.data))'

# Random sampling
echo '{"items": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}' | jsq '_.sampleSize($.items, 3)'
```

#### Object Utilities
```bash
# Merge objects with defaults
echo '{"user": {"name": "Alice"}}' | jsq '_.defaults($.user, {name: "Anonymous", role: "guest"})'

# Pick/omit properties
echo '{"user": {"name": "Alice", "email": "alice@example.com", "password": "secret"}}' | jsq '_.pick($.user, ["name", "email"])'

# Convert between arrays and objects
echo '{"pairs": [["a", 1], ["b", 2], ["c", 3]]}' | jsq '_.fromPairs($.pairs)'
```

#### String Manipulation
```bash
# Case transformations
echo '{"text": "hello-world_test case"}' | jsq '_.camelCase($.text)'  # "helloWorldTestCase"
echo '{"text": "HelloWorldTest"}' | jsq '_.kebabCase($.text)'      # "hello-world-test"
echo '{"text": "hello world"}' | jsq '_.startCase($.text)'        # "Hello World"
```

#### Mathematical Functions
```bash
# Statistical operations
echo '{"scores": [85, 92, 78, 95, 88]}' | jsq '_.mean($.scores)'  # Average
echo '{"values": [1, 5, 3, 9, 2]}' | jsq '_.max($.values)'       # Maximum

# Clamp values to range
echo '{"value": 15}' | jsq '_.clamp($.value, 5, 10)'  # 10 (clamped to max)

# Generate ranges and sequences
jsq '_.range(5)'           # [0, 1, 2, 3, 4]
jsq '_.range(2, 8, 2)'     # [2, 4, 6]
jsq '_.times(3, i => i * 2)'  # [0, 2, 4]
```

### RxJS-style Reactive Methods ✨ NEW

jsq now includes 20+ reactive programming methods inspired by RxJS for advanced data streaming and transformation:

#### Time-based Operators
| Method | Description | Example |
|--------|-------------|---------|
| `delay(ms)` | Delay emission by specified milliseconds | `$.data.delay(1000)` |
| `debounceTime(ms)` | Emit after specified quiet time | `$.stream.debounceTime(300)` |
| `throttleTime(ms)` | Emit at most once per time period | `$.events.throttleTime(1000)` |
| `timeout(ms)` | Error if no emission within time | `$.request.timeout(5000)` |
| `interval(ms)` | Emit array items at intervals | `$.items.interval(100)` |
| `timer(ms)` | Emit after delay then complete | `$.data.timer(500)` |

#### Advanced Transformation Operators
| Method | Description | Example |
|--------|-------------|---------|
| `concatMap(fn)` | Map and concat in order | `$.urls.concatMap(fetchData)` |
| `mergeMap(fn)` | Map and merge concurrently | `$.requests.mergeMap(process)` |
| `switchMap(fn)` | Map and switch to latest | `$.search.switchMap(query)` |
| `exhaustMap(fn)` | Map and ignore while active | `$.clicks.exhaustMap(save)` |

#### Enhanced Filtering Operators
| Method | Description | Example |
|--------|-------------|---------|
| `distinctUntilChanged(keyFn?)` | Emit only when value changes | `$.stream.distinctUntilChanged()` |
| `skipLast(count)` | Skip last N emissions | `$.data.skipLast(2)` |
| `takeLast(count)` | Take only last N emissions | `$.items.takeLast(5)` |

#### Stream Combination Operators
| Method | Description | Example |
|--------|-------------|---------|
| `combineLatest(other)` | Combine with latest from another stream | `$.stream1.combineLatest($.stream2)` |
| `zip(other)` | Zip with another stream pairwise | `$.names.zip($.ages)` |
| `merge(other)` | Merge with another stream | `$.events.merge($.logs)` |

#### Error Handling Operators
| Method | Description | Example |
|--------|-------------|---------|
| `retry(count?)` | Retry on error with exponential backoff | `$.request.retry(3)` |
| `catchError(handler)` | Handle errors gracefully | `$.data.catchError(err => [])` |

#### Utility Operators
| Method | Description | Example |
|--------|-------------|---------|
| `tap(fn)` | Perform side effects without changing stream | `$.data.tap(console.log)` |
| `startWith(value)` | Start stream with initial value | `$.stream.startWith('init')` |

#### Practical Examples

```bash
# Real-time data processing with delays
echo '[1,2,3,4,5]' | jsq '$.interval(200).map(x => x * 2)'

# Side effects for logging without changing data
echo '{"users": [{"name": "Alice"}, {"name": "Bob"}]}' | jsq '$.users.tap(console.log).pluck("name")'

# Debounced search simulation
echo '["a", "ab", "abc"]' | jsq '$.debounceTime(100).map(q => `Searching: ${q}`)'

# Error handling with retry
echo '{"requests": ["url1", "url2"]}' | jsq '$.requests.map(url => fetch(url)).retry(2)'

# Stream combination
echo '{"names": ["Alice", "Bob"], "ages": [25, 30]}' | jsq '$.names.zip($.ages).map(([name, age]) => ({name, age}))'
```

### Aggregation Operations

| Method | Description | Example |
|--------|-------------|---------|
| `length()` | Get element count | `$.items.length()` |

## 🎛️ Command Line Options

```bash
jsq [options] <expression>          # Node.js (default)
jsq bun [options] <expression>      # Bun runtime
jsq deno [options] <expression>     # Deno runtime

Options:
  -v, --verbose           Display detailed execution information
  -d, --debug            Enable debug mode
  -s, --stream           Enable streaming mode for large datasets
  -b, --batch <size>     Process in batches of specified size (implies --stream)
  -p, --parallel [workers] Enable parallel processing (optionally specify worker count) ✨ NEW
  --json-lines           Input/output in JSON Lines format
  -f, --file <path>      Read from file instead of stdin
  --file-format <format> Specify input file format (json, jsonl, csv, tsv, parquet, auto)
  -w, --watch            Watch input file for changes and re-execute expression ✨ NEW
  --repl                 Start interactive REPL mode
  --no-network           Legacy option (deprecated, no effect in VM mode)
  --no-shell             Legacy option (deprecated, no effect in VM mode)
  --no-fs                Legacy option (deprecated, no effect in VM mode)
  --sandbox              Legacy option (deprecated, VM isolation is now default)
  --memory-limit <mb>    Memory limit in MB (default: 128)
  --cpu-limit <ms>       CPU time limit in milliseconds (default: 30000)
  --safe                 Legacy option (deprecated, shows warning)
  --unsafe               Run in unsafe mode without VM isolation (dangerous!)
  --help                 Display help
  --version              Display version
```

### Runtime-Specific Usage

#### Quick Start Examples
```bash
# Node.js (default)
echo '{"data": [1,2,3]}' | jsq '$.data.map(x => x * 2)'

# Bun (faster execution)
echo '{"data": [1,2,3]}' | jsq bun '$.data.map(x => x * 2)'

# Deno (secure by default)
echo '{"data": [1,2,3]}' | jsq deno '$.data.map(x => x * 2)'
```

## 🔄 Migration from jq

| jq | jsq |
|----|-----|
| `.users[] \| select(.active)` | `$.users.filter(u => u.active)` |
| `.users[] \| .name` | `$.users.pluck("name")` |
| `.users \| length` | `$.users.length()` |
| `.products \| sort_by(.price)` | `$.products.sortBy("price")` |
| `.items[] \| select(.price > 100)` | `$.items.filter(i => i.price > 100)` |

## 🏗️ Architecture

jsq consists of the following main components:

- **Chaining Engine**: Provides jQuery-style method chaining
- **Library Manager**: Dynamic loading and caching of npm packages
- **VM Executor**: Provides secure execution environment
- **JSON Parser**: High-performance JSON parsing and error handling

## 💡 Practical Examples

### Advanced Data Processing

```bash
# Complex user analytics with new methods
cat users.json | jsq '
  $.users
    .filter(u => u.active)
    .groupBy(u => u.department)
    .entries()
    .map(([dept, users]) => ({
      department: dept,
      count: users.length,
      avgSalary: _.mean(users.map(u => u.salary)),
      topPerformer: _.maxBy(users, u => u.performance)
    }))
    .orderBy(["avgSalary"], ["desc"])
'

# Parallel processing for massive datasets (20x faster than jq!)
cat huge-logs.jsonl | jsq --parallel 8 '
  $.filter(log => log.level === "error" && log.timestamp > "2024-01-01")
    .map(log => ({
      service: log.service,
      error: log.message,
      timestamp: new Date(log.timestamp).toISOString()
    }))
    .groupBy(log => log.service)
'

# Remove duplicates and clean data
cat messy-data.json | jsq '
  $.records
    .compact()                    # Remove null/undefined entries
    .uniqBy(r => r.email)        # Remove duplicate emails
    .map(r => _.pick(r, ["id", "name", "email", "department"]))
    .orderBy(["department", "name"])
'

# Statistical analysis with confidence
cat sales.json | jsq '
  $.sales
    .groupBy(s => s.quarter)
    .entries()
    .map(([quarter, sales]) => ({
      quarter,
      revenue: _.sum(sales.map(s => s.amount)),
      avgDeal: _.mean(sales.map(s => s.amount)),
      topDeal: _.max(sales.map(s => s.amount)),
      deals: sales.length
    }))
'
```

### Log Analysis

```bash
# Advanced error analysis
cat server.log | jsq '
  $.logs
    .filter(log => log.level === "error")
    .countBy(log => log.component)
    .entries()
    .map(([component, count]) => ({component, errorCount: count}))
    .orderBy(["errorCount"], ["desc"])
    .take(5)
'

# Performance monitoring
cat access.log | jsq '
  $.requests
    .filter(r => r.responseTime > 1000)
    .groupBy(r => r.endpoint)
    .entries()
    .map(([endpoint, reqs]) => ({
      endpoint,
      slowRequests: reqs.length,
      avgResponseTime: _.mean(reqs.map(r => r.responseTime)),
      maxResponseTime: _.max(reqs.map(r => r.responseTime))
    }))
'
```

### Data Transformation & Cleaning

```bash
# API response normalization with advanced methods
cat api-response.json | jsq '
  $.results
    .compact()                                    # Remove empty results
    .map(item => ({
      id: item._id,
      name: _.startCase(item.displayName),        # Format names properly
      email: item.contact?.email,
      active: item.status === "active",
      tags: _.uniq(item.tags || [])              # Remove duplicate tags
    }))
    .filter(item => item.email)                  # Only items with email
    .orderBy(["name"])
'

# Generate reports with grouping and statistics
cat transactions.json | jsq '
  $.transactions
    .filter(t => t.status === "completed")
    .groupBy(t => t.category)
    .entries()
    .map(([category, txns]) => ({
      category: _.startCase(category),
      totalAmount: _.sum(txns.map(t => t.amount)),
      avgAmount: _.mean(txns.map(t => t.amount)),
      transactionCount: txns.length,
      dateRange: {
        earliest: _.minBy(txns, t => t.date)?.date,
        latest: _.maxBy(txns, t => t.date)?.date
      }
    }))
    .orderBy(["totalAmount"], ["desc"])
'
```

### Advanced String Processing

```bash
# Clean and standardize text data
cat user-input.json | jsq '
  $.responses
    .map(r => ({
      id: r.id,
      name: _.startCase(_.camelCase(r.raw_name)),     # "john_doe" → "John Doe"
      slug: _.kebabCase(r.title),                     # "My Title" → "my-title"
      category: _.upperFirst(_.camelCase(r.category)) # "USER_TYPE" → "UserType"
    }))
'

# Generate configuration files
cat config-data.json | jsq '
  $.settings
    .entries()
    .map(([key, value]) => `${_.snakeCase(key).toUpperCase()}=${value}`)
    .join("\n")
'
```

### Complex Chaining Examples

```bash
# E-commerce analytics pipeline
cat orders.json | jsq '
  $.orders
    .filter(o => o.status === "delivered")
    .flattenDeep()                               # Flatten nested order items
    .groupBy(item => item.category)
    .entries()
    .map(([category, items]) => ({
      category,
      revenue: _.sum(items.map(i => i.price * i.quantity)),
      unitsSold: _.sum(items.map(i => i.quantity)),
      avgPrice: _.mean(items.map(i => i.price)),
      topProduct: _.maxBy(items, i => i.quantity)?.name
    }))
    .orderBy(["revenue"], ["desc"])
    .take(10)
'

# Customer segmentation
cat customers.json | jsq '
  $.customers
    .filter(c => c.lastPurchase)
    .map(c => ({
      ...c,
      segment: c.totalSpent > 1000 ? "premium" : 
               c.totalSpent > 500 ? "standard" : "basic",
      daysSinceLastPurchase: Math.floor((Date.now() - new Date(c.lastPurchase)) / 86400000)
    }))
    .groupBy(c => c.segment)
    .entries()
    .map(([segment, customers]) => ({
      segment,
      count: customers.length,
      avgSpent: _.mean(customers.map(c => c.totalSpent)),
      retention: customers.filter(c => c.daysSinceLastPurchase < 30).length / customers.length
    }))
'
```

### Advanced Async Processing & System Integration ✨ NEW

```bash
# Multi-endpoint API aggregation with parallel processing
cat endpoints.json | jsq '
  console.log("Fetching data from", $.endpoints.length, "endpoints...");
  const results = await $.endpoints.mapAsync(async endpoint => {
    const response = await fetch(endpoint.url);
    const data = await response.json();
    return { source: endpoint.name, data: data.slice(0, 5) }; # Take first 5 items
  });
  console.log("Aggregated", results.length, "sources");
  results
'

# Sequential API processing with rate limiting
cat api-keys.json | jsq '
  console.log("Processing", $.keys.length, "API calls with rate limiting...");
  await $.keys.forEachAsyncSeq(async (key, index) => {
    console.log(`Processing ${index + 1}/${$.keys.length}: ${key.name}`);
    const response = await fetch(`https://api.example.com/data?key=${key.value}`);
    await new Promise(r => setTimeout(r, 100)); # Rate limit: 100ms between calls
  });
  "All API calls completed"
'

```

## 🎮 REPL Commands & Navigation

The interactive REPL supports these keyboard shortcuts:

| Shortcut | Action |
|----------|--------|
| `Ctrl+R` | Toggle data view |
| `Ctrl+L` | Clear expression |
| `Ctrl+C` / `Ctrl+D` | Exit REPL |
| `←` / `→` | Move cursor |
| `Ctrl+A` | Move to beginning |
| `Ctrl+E` | Move to end |
| `Backspace` | Delete character |

## 🔧 Development & Contributing

### Node.js Development
```bash
# Development environment setup
git clone https://github.com/nnao45/jsq.git
cd jsq
npm install

# Build
npm run build

# Run tests
npm test

# Development mode
npm run dev

# Start REPL with test data
jsq --repl --file test-repl-data.json
```

### Bun Development
```bash
# Setup for Bun
bun install

# Build with Bun
bun run build:bun

# Run tests with Bun
bun run test:bun

# Development mode with Bun
bun run dev:bun

# Start with Bun
bun run start:bun
```

### Deno Development
```bash
# No installation needed, works directly

# Check TypeScript
deno check src/**/*.ts

# Run tests
deno test --allow-all

# Development mode
deno run --allow-all --watch src/simple-cli.ts

# Format code
deno fmt

# Lint code
deno lint
```

## ✅ Implemented Features

### Core Features
- [x] **Beautiful Interactive REPL** - Real-time evaluation with colorful UI
- [x] **Dynamic Color Prompt** - Multi-colored ❯❯❯ that changes every second
- [x] **Smart Loading Indicators** - Visual feedback for processing time
- [x] **Pipeline Variable Declarations** ✨ NEW - Declare and use variables in expressions (`const x = value | x.method()`)
- [x] **Sequential Execution with Semicolon Operator** ✨ NEW - Execute multiple expressions sequentially with side effects (`console.log("debug"); $.data`)
- [x] **Advanced Async Array Methods** ✨ NEW - Parallel and sequential async processing (`forEachAsync`, `mapAsync`, `forEachAsyncSeq`, `mapAsyncSeq`)
- [x] **Built-in Fetch & Async/Await Support** ✨ NEW - Native fetch API and async/await for HTTP requests and asynchronous operations
- [x] **Multi-CPU Parallel Processing** ✨ NEW - Leverage all CPU cores for blazingly fast processing (10-20x faster than jq)
- [x] **Streaming processing** - Large file support with real-time output
- [x] **JSON Lines format support** - Handle JSONL data efficiently  
- [x] **CSV/TSV/Parquet file support** - Multiple data format compatibility
- [x] **Batch processing mode** - Process large datasets in chunks
- [x] **Direct file reading** - Built-in file input support
- [x] **Secure execution with VM isolation** - Safe code execution environment
- [x] **Full TypeScript support** - Type-safe development experience

### 🚀 Multi-Runtime Support
- [x] **Node.js Compatible** - Full support for Node.js 16+ with npm ecosystem (`jsq`)
- [x] **Bun Ready** - Native Bun support with faster execution via subcommand (`jsq bun`)
- [x] **Deno Compatible** - Works with Deno's secure-by-default runtime via subcommand (`jsq deno`)
- [x] **Cross-Runtime Library Loading** - Automatic runtime detection and package management
- [x] **Unified Subcommand Interface** - Single binary with runtime-specific execution

### Comprehensive Method Library (85+ Methods)
- [x] **60+ Built-in Utility Methods** - Extensive lodash-like method collection without external dependencies
- [x] **Array Manipulation** - uniqBy, flatten, compact, chunk, shuffle, sample, takeWhile, dropWhile
- [x] **Advanced Sorting** - orderBy with multi-key support, groupBy, countBy, keyBy
- [x] **Object Operations** - pick, omit, invert, merge, defaults, entries transformation
- [x] **Statistical Functions** - mean, min/max, minBy/maxBy for data analysis
- [x] **String Utilities** - camelCase, kebabCase, snakeCase, startCase, capitalize
- [x] **Mathematical Tools** - clamp, random, range generation, times iteration
- [x] **Collection Methods** - size, isEmpty, includes for arrays and objects
- [x] **Function Utilities** - debounce, throttle, identity, constant, noop
- [x] **4+ Async Array Methods** ✨ NEW - forEachAsync, forEachAsyncSeq, mapAsync, mapAsyncSeq for parallel and sequential async processing
- [x] **20+ RxJS-style Reactive Methods** ✨ NEW - Time-based operators (delay, debounce, throttle, interval), transformation operators (concatMap, mergeMap, switchMap), filtering (distinctUntilChanged), stream combination (zip, merge), error handling (retry, catchError), and utilities (tap, startWith)
- [x] **Sequential Execution Support** ✨ NEW - Semicolon operator for multi-expression execution with side effects
- [x] **Chainable API** - All methods work seamlessly with jQuery-style chaining

## 🚧 Future Plans

- [ ] Plugin system
- [ ] Advanced type checking
- [ ] GraphQL support
- [ ] WebAssembly integration
- [ ] Distributed processing support

## 📄 License

MIT License

## 🤝 Support & Feedback

Please report bugs and feature requests on [GitHub Issues](https://github.com/nnao45/jsq/issues).

---

**@nnao45/jsq** revolutionizes JSON processing with a beautiful, interactive interface that makes data exploration enjoyable. By combining the power of jq with JavaScript familiarity and stunning visual design, it's the ultimate tool for developers who value both functionality and aesthetics.

## 🌐 Cross-Runtime Compatibility

jsq is designed to work seamlessly across all major JavaScript runtimes:

| Runtime | Status | Installation | Performance | Notes |
|---------|--------|--------------|-------------|-------|
| **Node.js** | ✅ Full Support | `npm install -g @nnao45/jsq` | Standard | Complete ecosystem access |
| **Bun** | ✅ Native Support | `bun add -g @nnao45/jsq` | **Fast** | Built-in bundler, faster execution |
| **Deno** | ✅ Compatible | Direct URL import | Standard | Secure by default, no npm install needed |

### Runtime Detection
jsq automatically detects your runtime environment and optimizes accordingly:
- **Package Management**: Uses npm, bun add, or deno imports as appropriate
- **Module Resolution**: Handles different import/require patterns
- **Performance**: Leverages runtime-specific optimizations
- **Security**: Respects each runtime's security model

## 🎨 Visual Highlights

- **Dynamic Multi-Color Prompt**: Watch the ❯❯❯ characters cycle through vibrant colors
- **Real-Time Feedback**: Instant visual confirmation of your expressions
- **Elegant Loading States**: Sophisticated indicators that respect your time
- **Clean Layout**: Fixed positioning that never interrupts your workflow

Experience the future of command-line JSON processing - where powerful functionality meets beautiful design.