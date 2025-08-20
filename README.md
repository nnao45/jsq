# @nnao45/jsq - JavaScript-Powered JSON Query CLI Tool

[🇯🇵 日本語](README.ja.md) | 🇺🇸 **English**

jsq is an innovative command-line tool that allows developers to process JSON data using familiar jQuery/Lodash-like syntax. It combines a beautiful real-time REPL interface with powerful data processing capabilities, making JSON manipulation intuitive and visually engaging.

## 🌟 Key Features

### 1. 🔗 jQuery-style Chaining API with 60+ Built-in Methods
Process JSON with intuitive syntax and comprehensive utility library - no external dependencies needed

```bash
# jq (requires learning complex syntax)
cat users.json | jq '.users[] | select(.active == true) | .name'

# jsq (intuitive with rich built-in methods)
cat users.json | jsq '$.users.filter(u => u.active).pluck("name")'

# Advanced data processing with built-in lodash-like methods
cat data.json | jsq '$.items.compact().uniqBy(i => i.id).orderBy(["priority", "date"], ["desc", "asc"])'

# Statistical analysis without external libraries
cat sales.json | jsq '$.sales.groupBy(s => s.category).entries().map(([cat, sales]) => ({category: cat, avg: _.mean(sales.map(s => s.amount))}))'
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

### Aggregation Operations

| Method | Description | Example |
|--------|-------------|---------|
| `length()` | Get element count | `$.items.length()` |

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

### Core Features
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
- [x] **Full TypeScript support** - Type-safe development experience

### Comprehensive Lodash-like Method Library
- [x] **60+ Built-in Utility Methods** - Extensive method collection without external dependencies
- [x] **Array Manipulation** - uniqBy, flatten, compact, chunk, shuffle, sample, takeWhile, dropWhile
- [x] **Advanced Sorting** - orderBy with multi-key support, groupBy, countBy, keyBy
- [x] **Object Operations** - pick, omit, invert, merge, defaults, entries transformation
- [x] **Statistical Functions** - mean, min/max, minBy/maxBy for data analysis
- [x] **String Utilities** - camelCase, kebabCase, snakeCase, startCase, capitalize
- [x] **Mathematical Tools** - clamp, random, range generation, times iteration
- [x] **Collection Methods** - size, isEmpty, includes for arrays and objects
- [x] **Function Utilities** - debounce, throttle, identity, constant, noop
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

## 🎨 Visual Highlights

- **Dynamic Multi-Color Prompt**: Watch the ❯❯❯ characters cycle through vibrant colors
- **Real-Time Feedback**: Instant visual confirmation of your expressions
- **Elegant Loading States**: Sophisticated indicators that respect your time
- **Clean Layout**: Fixed positioning that never interrupts your workflow

Experience the future of command-line JSON processing - where powerful functionality meets beautiful design.