[![NPM](https://nodei.co/npm/@nnao45/jsq.png)](https://www.npmjs.com/package/@nnao45/jsq)


[![npm](https://img.shields.io/npm/v/@nnao45/jsq.svg)](https://www.npmjs.com/package/@nnao45/jsq)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Documentation](https://img.shields.io/badge/docs-nnao45.github.io%2Fjsq-blue)](https://nnao45.github.io/jsq)

# jsq - JavaScript-Powered JSON Query CLI

[🇯🇵 日本語](README.ja.md) | 🇺🇸 **English** | [📚 Documentation](https://nnao45.github.io/jsq)

jsq is a secure, jQuery/Lodash-style JSON processor with 110+ built-in methods, multi-core parallel processing, and a beautiful interactive REPL. Process JSON with familiar JavaScript syntax - no external dependencies needed.

## ✨ Why jsq?

```bash
# 🔗 jQuery-style chaining with 110+ built-in methods  
cat data.json | jsq '$.users.filter(u => u.active).pluck("name").uniq()'

# 🎨 Beautiful interactive REPL with real-time evaluation
curl -H "Accept: application/json" https://api.example.com/data | jsq

# 🔒 Secure VM isolation by default
cat sensitive.json | jsq '$.private' # Safe: No file/network access

# 📝 Intuitive variable declarations
jsq "const names = ['Alice', 'Bob'] | names.map(n => n.toUpperCase())"

# 🚀 parallel processing
cat huge.jsonl | jsq --parallel '$.filter(item => item.active)'
```

## 🚀 Quick Start

```bash
# Install
npm install -g @nnao45/jsq

# Basic usage
echo '{"users": [{"name": "Alice", "active": true}]}' | jsq '$.users.filter(u => u.active)'

# Direct file processing
jsq '$.length' --file data.json

# Interactive REPL
jsq 

# Interactive REPL with pipe!
echo '{"users": [{"name": "Alice", "active": true}]}' | jsq 
```

## 🌟 Key Features

| Feature | Description                                          |
|---------|------------------------------------------------------|
| **jQuery-style API** | Familiar `$.filter()`, `$.map()`, `$.pluck()` syntax |
| **110+ Built-in Methods** | Lodash utilities + RxJS reactive operators included  |
| **Parallel Processing** | Use all CPU cores - 20x faster than jq               |
| **Interactive REPL** | Beautiful real-time evaluation with tab completion   |
| **Secure VM Isolation** | Safe execution by default                            |
| **Multi-Runtime Support** | Works with Node.js, Bun, Deno and WASM               |

## 📚 Documentation

For comprehensive documentation, visit **[nnao45.github.io/jsq](https://nnao45.github.io/jsq)**:

- [Getting Started Guide](https://nnao45.github.io/jsq/getting-started)
- [Method Reference](https://nnao45.github.io/jsq/smart-dollar-methods)
- [Interactive Playground](https://nnao45.github.io/jsq/repl)
- [Examples & Tutorials](https://nnao45.github.io/jsq)

## 💡 Common Use Cases

```bash
# Data Analysis
cat sales.json | jsq '$.groupBy(s => s.category).entries().map(([cat, items]) => ({
  category: cat,
  total: _.sum(items.map(i => i.amount)),
  average: _.mean(items.map(i => i.amount))
}))'

# Log Processing (with parallel execution)
cat logs.jsonl | jsq --parallel --stream '$.filter(log => log.level === "error")'

# API Response Transformation
curl api.example.com/users | jsq '$.data.users.map(u => _.pick(u, ["id", "name", "email"]))'

# Real-time Monitoring
jsq '$.servers.filter(s => s.status === "down").length' --file status.json --watch
```

## 🔄 Migration from jq

| jq | jsq |
|----|-----|
| `.users[] \| select(.active)` | `$.users.filter(u => u.active)` |
| `.users[] \| .name` | `$.users.pluck("name")` |
| `.users \| length` | `$.users.length()` |
| `.products \| sort_by(.price)` | `$.products.sortBy("price")` |

## 🤝 Contributing

Contributions are welcome! See our [Contributing Guide](https://github.com/nnao45/jsq/blob/main/CONTRIBUTING.md).

## 📄 License

MIT License

## 🤝 Support & Feedback

Please report bugs and feature requests on [GitHub Issues](https://github.com/nnao45/jsq/issues).

---

**@nnao45/jsq** revolutionizes JSON processing with a beautiful, interactive interface that makes data exploration enjoyable. By combining the power of jq with JavaScript familiarity and stunning visual design, it's the ultimate tool for developers who value both functionality and aesthetics.