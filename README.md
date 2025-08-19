# @nnao45/jsq - JavaScript-Powered JSON Query CLI Tool

[🇯🇵 日本語](README.ja.md) | 🇺🇸 **English**

jsq is an innovative command-line tool that allows developers to process JSON data using familiar jQuery/Lodash-like syntax. It combines a beautiful real-time REPL interface with powerful data processing capabilities, making JSON manipulation intuitive and visually engaging.

## 🌟 Key Features

### 1. jQuery-style Chaining API
Process JSON with intuitive syntax familiar to web developers

```bash
# jq (requires learning)
cat users.json | jq '.users[] | select(.active == true) | .name'

# jsq (intuitive)
cat users.json | jsq '$.users.filter(u => u.active).pluck("name")'
```

### 2. 🔗 npm Library Integration
Dynamically load and use any npm library

```bash
# Advanced data processing with Lodash
cat data.json | jsq --use lodash '_.orderBy($.users, ["age"], ["desc"])'

# Multiple libraries simultaneously
cat data.json | jsq --use lodash,moment '_.map($.events, e => ({...e, formatted: moment(e.date).format("YYYY-MM-DD")}))'

# Direct file reading
jsq '$.users.length' --file data.json
jsq '$.name' --file users.jsonl --stream

# Interactive REPL mode
jsq --repl --file data.json  # Real-time data exploration
```

### 3. ⚡ Fast Execution & Optional Security
Fast execution by default, with optional VM isolation for security-critical use cases

```bash
# Default (fast) mode execution
cat data.json | jsq --use lodash '_.uniq(data.tags)'

# Security-focused execution with --safe option
cat data.json | jsq --use lodash --safe '_.uniq(data.tags)'
```

### 4. 📈 Intelligent Caching
Automatically cache installed libraries for fast subsequent use

### 5. 🎯 Full TypeScript Support
Provides type-safe processing and excellent developer experience

## 📦 Installation

```bash
npm install -g @nnao45/jsq
```

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

## 🔧 Advanced Features

### Using npm Libraries

#### Advanced Data Processing with Lodash

```bash
# Grouping
cat data.json | jsq --use lodash '_.groupBy($.users, "department")'

# Deep cloning
cat data.json | jsq --use lodash '_.cloneDeep($.config)'

# Complex sorting
cat data.json | jsq --use lodash '_.orderBy($.products, ["category", "price"], ["asc", "desc"])'
```

#### Date Processing Libraries

```bash
# Date formatting with Moment.js
cat events.json | jsq --use moment '$.events.map(e => ({...e, formatted: moment(e.timestamp).format("YYYY/MM/DD HH:mm")}))'

# Date calculations with Day.js
cat logs.json | jsq --use dayjs '$.logs.filter(log => dayjs(log.date).isAfter(dayjs().subtract(1, "week")))'
```

### Security Features

jsq provides fast execution by default, with optional VM sandbox environment for secure execution:

```bash
# Default (fast) mode execution
cat data.json | jsq --use lodash '_.uniq(data.tags)'
# ⚡ Running in fast mode (VM disabled)

# Security-focused execution with --safe flag
cat data.json | jsq --use lodash --safe '_.sortBy(data.items, "name")'
# 🔒 Running in secure VM mode
```

### Streaming Processing Demo

```bash
# Experience real-time data processing
for i in {1..3}; do echo "{\"id\":$i,\"name\":\"User$i\"}"; sleep 1; done | jsq '$.name' --stream
# Output:
# "User1"
# "User2"  (after 1 second)
# "User3"  (after another second)
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

### Array Operations

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

### Aggregation Operations

| Method | Description | Example |
|--------|-------------|---------|
| `length()` | Get element count | `$.items.length()` |
| `sum(key?)` | Calculate sum | `$.orders.sum("amount")` |
| `keys()` | Get object keys | `$.config.keys()` |
| `values()` | Get object values | `$.settings.values()` |

## 🎛️ Command Line Options

```bash
jsq [options] <expression>

Options:
  -v, --verbose           Display detailed execution information
  -d, --debug            Enable debug mode
  -u, --use <libraries>  Load npm libraries (comma-separated)
  -s, --stream           Enable streaming mode for large datasets
  -b, --batch <size>     Process in batches of specified size (implies --stream)
  --json-lines           Input/output in JSON Lines format
  -f, --file <path>      Read from file instead of stdin
  --file-format <format> Specify input file format (json, jsonl, csv, tsv, parquet, auto)
  --repl                 Start interactive REPL mode
  --safe                 Run with VM isolation (slower but more secure)
  --unsafe               Legacy option (deprecated, use --safe recommended)
  --help                 Display help
  --version              Display version
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

### Log Analysis

```bash
# Extract and aggregate error logs
cat server.log | jsq '$.logs.filter(log => log.level === "error").groupBy("component").mapValues(logs => logs.length)'

# Latest TOP 5 errors
cat server.log | jsq '$.logs.filter(l => l.level === "error").sortBy("timestamp").take(5)'
```

### Data Transformation

```bash
# API response normalization
cat api-response.json | jsq '$.results.map(item => ({id: item._id, name: item.displayName, active: item.status === "active"}))'

# CSV-like data generation
cat users.json | jsq '$.users.map(u => [u.id, u.name, u.email].join(",")).join("\n")'
```

### Report Generation

```bash
# Sales summary
cat sales.json | jsq --use lodash '_.chain($.sales).groupBy("month").mapValues(sales => _.sumBy(sales, "amount")).value()'

# User statistics
cat analytics.json | jsq '$.users.groupBy("country").mapValues(users => ({count: users.length, avgAge: users.reduce((sum, u) => sum + u.age, 0) / users.length}))'
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

## ✅ Implemented Features

- [x] **Beautiful Interactive REPL** - Real-time evaluation with colorful UI
- [x] **Dynamic Color Prompt** - Multi-colored ❯❯❯ that changes every second
- [x] **Smart Loading Indicators** - Visual feedback for processing time
- [x] **Streaming processing** - Large file support with real-time output
- [x] **JSON Lines format support** - Handle JSONL data efficiently  
- [x] **CSV/TSV/Parquet file support** - Multiple data format compatibility
- [x] **Batch processing mode** - Process large datasets in chunks
- [x] **Direct file reading** - Built-in file input support
- [x] **Secure execution with VM isolation** - Safe code execution environment
- [x] **Dynamic npm library loading** - Use any npm package on-demand
- [x] **Functional programming methods** - Comprehensive chainable API
- [x] **Full TypeScript support** - Type-safe development experience

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

## 🎨 Visual Highlights

- **Dynamic Multi-Color Prompt**: Watch the ❯❯❯ characters cycle through vibrant colors
- **Real-Time Feedback**: Instant visual confirmation of your expressions
- **Elegant Loading States**: Sophisticated indicators that respect your time
- **Clean Layout**: Fixed positioning that never interrupts your workflow

Experience the future of command-line JSON processing - where powerful functionality meets beautiful design.