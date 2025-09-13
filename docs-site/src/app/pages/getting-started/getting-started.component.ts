import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarkdownService } from '../../services/markdown.service';
import { CodeHighlightService } from '../../services/code-highlight.service';

@Component({
  selector: 'app-getting-started',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <article class="prose" [innerHTML]="content"></article>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class GettingStartedComponent implements OnInit {
  content = '';
  
  private markdownContent = `# Getting Started

Get up and running with jsq in minutes!

## Installation

### Node.js (npm) - Primary Installation

The easiest way to install jsq is through npm:

\`\`\`bash
npm install -g @nnao45/jsq
\`\`\`

Verify the installation:

\`\`\`bash
jsq --version
\`\`\`

### Cross-Runtime Compatibility

jsq supports multiple JavaScript runtimes through subcommands:

- **Node.js**: \`jsq\` (default)
- **Bun**: \`jsq bun\` (faster startup, better performance)
- **Deno**: \`jsq deno\` (secure by default, TypeScript native)

> **Warning**: Cross-runtime support only works with the \`--unsafe\` option

## Basic Usage

### Your First jsq Command

Let's start with a simple example:

\`\`\`bash
echo '{"message": "Hello, jsq!"}' | jsq '$.message'
# Output: "Hello, jsq!"
\`\`\`

### Working with Arrays

jsq excels at processing arrays with its jQuery-style API:

\`\`\`bash
echo '[1, 2, 3, 4, 5]' | jsq '$.filter(n => n > 3)'
# Output: [4, 5]

echo '[{"name": "Alice"}, {"name": "Bob"}]' | jsq '$.pluck("name")'
# Output: ["Alice", "Bob"]
\`\`\`

### Using Pipeline Variables

Declare variables for cleaner expressions:

\`\`\`bash
echo '{"users": [{"age": 25}, {"age": 30}]}' | jsq '
  const ages = $.users.pluck("age") | 
  ages.sum()
'
# Output: 55
\`\`\`

## Reading from Files

jsq can directly read various file formats:

### JSON Files

\`\`\`bash
jsq '$.users.length' --file data.json
\`\`\`

### JSON Lines (JSONL)

\`\`\`bash
jsq '$.filter(log => log.level === "error")' --file logs.jsonl --stream
\`\`\`

### CSV Files

\`\`\`bash
jsq '$.filter(row => row.status === "active")' --file users.csv --file-format csv
\`\`\`

## Web Browser Usage (WASM)

jsq can run directly in the browser! Check out our interactive playground or integrate it into your web applications.

### Quick Setup

1. Include the jsq browser bundle:

\`\`\`html
<script src="https://cdn.jsdelivr.net/npm/@nnao45/jsq/dist/jsq-browser.js"></script>
\`\`\`

2. Use jsq in your JavaScript:

\`\`\`javascript
// Wait for jsq to initialize
await jsq.initialize();

// Process JSON data
const data = { users: [{ name: "Alice", age: 25 }] };
const result = await jsq.evaluate('$.users.filter(u => u.age > 20)', data);
console.log(result); // [{ name: "Alice", age: 25 }]
\`\`\`

### Building from Source

If you want to build the WASM version yourself:

\`\`\`bash
# Clone the repository
git clone https://github.com/nnao45/jsq.git
cd jsq/examples/web-ui

# Install dependencies
npm install

# Build for production
npm run build

# Or start development server
npm run dev
\`\`\`

The built files will be in the \`dist/\` directory.

## Performance Optimization

### Parallel Processing

For large datasets, enable parallel processing:

\`\`\`bash
# Use all CPU cores - 1
cat large-data.jsonl | jsq --parallel '$.filter(item => item.active)'

# Specify exact worker count
cat huge-file.jsonl | jsq --parallel 8 '$.map(transform)'
\`\`\`

### Streaming Mode

Process large files efficiently with streaming:

\`\`\`bash
jsq --stream '$.filter(log => log.timestamp > "2024-01-01")' --file massive-logs.jsonl
\`\`\`

### Batch Processing

Combine streaming with batch processing:

\`\`\`bash
jsq --batch 1000 '$.process()' --file huge-dataset.jsonl
\`\`\`

## Security Considerations

### Default VM Isolation

By default, jsq runs all expressions in a secure VM sandbox:

\`\`\`bash
# This is safe - runs in VM
cat data.json | jsq '$.users.filter(u => u.active)'
\`\`\`

### Resource Limits

Control memory and CPU usage:

\`\`\`bash
# Limit to 256MB memory and 60 seconds CPU time
jsq --memory-limit 256 --cpu-limit 60000 '$.heavyProcessing()'
\`\`\`

### Unsafe Mode

Only use \`--unsafe\` when you need filesystem or network access:

\`\`\`bash
# Required for fetch() or file operations
jsq --unsafe 'await fetch("https://api.example.com/data").then(r => r.json())'
\`\`\`

> **Danger**: Never use \`--unsafe\` with untrusted code!

## Common Patterns

### Data Transformation

\`\`\`bash
# Transform and clean data
cat users.json | jsq '
  $.users
    .filter(u => u.email)
    .map(u => ({
      id: u.id,
      name: u.name.trim(),
      email: u.email.toLowerCase()
    }))
    .uniqBy(u => u.email)
'
\`\`\`

### Aggregation

\`\`\`bash
# Calculate statistics
cat sales.json | jsq '
  $.sales.groupBy(s => s.category)
    .entries()
    .map(([cat, items]) => ({
      category: cat,
      total: _.sum(items.map(i => i.amount)),
      average: _.mean(items.map(i => i.amount))
    }))
'
\`\`\`

### Error Handling

\`\`\`bash
# Graceful error handling
echo '{"data": null}' | jsq '
  try {
    $.data.process()
  } catch (e) {
    { error: "No data available" }
  }
'
\`\`\`

## Next Steps

- Explore the [Smart Dollar Methods](/smart-dollar-methods) reference
- Learn about [Lodash Methods](/lodash-methods) integration
- Try the Interactive Playground
- Read about Advanced Features like async processing and RxJS operators

Ready to dive deeper? Check out our comprehensive method references!`;

  constructor(
    private markdown: MarkdownService,
    private codeHighlight: CodeHighlightService
  ) {}

  ngOnInit() {
    this.content = this.markdown.parse(this.markdownContent);
    // Highlight code after view init
    setTimeout(() => this.codeHighlight.highlightAll(), 0);
  }
}