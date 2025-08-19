# jsq - JavaScript-Powered JSON Query Tool

[🇯🇵 日本語](README.ja.md) | 🇺🇸 **English**

jsq is an innovative command-line tool that allows developers to process JSON data using familiar jQuery/Lodash-like syntax. It solves the high learning curve of jq by leveraging existing JavaScript skills for intuitive JSON manipulation.

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
npm install -g jsq
```

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
for i in {1..3}; do echo "{\"id\":$i,\"name\":\"User$i\"}"; sleep 1; done | node dist/index.js '$.name' --stream
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
```

## ✅ Implemented Features

- [x] Streaming processing (large file support)
- [x] JSON Lines format support
- [x] CSV/TSV/Parquet file support
- [x] Batch processing mode
- [x] Direct file reading
- [x] Interactive REPL mode
- [x] Secure execution with VM isolation
- [x] Dynamic npm library loading
- [x] Functional programming methods
- [x] Full TypeScript support

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

**jsq** aims to revolutionize the developer experience in JSON processing. By combining the power of jq with the familiarity of JavaScript, it's a tool that maximizes your existing skills.