import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JsqPlaygroundComponent } from '../../components/jsq-playground/jsq-playground.component';
import { MarkdownService } from '../../services/markdown.service';
import { CodeHighlightService } from '../../services/code-highlight.service';

interface MethodExample {
  data: any;
  expression: string;
}

interface Method {
  name: string;
  description: string;
  syntax: string;
  example: string;
  playground?: MethodExample;
}

interface MethodCategory {
  name: string;
  description: string;
  methods: Method[];
}

@Component({
  selector: 'app-smart-dollar-methods',
  standalone: true,
  imports: [CommonModule, JsqPlaygroundComponent],
  template: `
    <div class="container">
      <div class="prose">
        <h1>Smart Dollar ($) Methods</h1>
        <p>The Smart Dollar (<code>$</code>) API provides a jQuery-like chainable interface for data manipulation with 80+ built-in methods.</p>
        
        <div class="toc">
          <h2>Table of Contents</h2>
          <ul>
            <li *ngFor="let category of categories">
              <a [href]="'#' + getCategoryId(category.name)">{{ category.name }}</a>
            </li>
          </ul>
        </div>

        <div *ngFor="let category of categories" class="method-category">
          <h2 [id]="getCategoryId(category.name)">{{ category.name }}</h2>
          <p>{{ category.description }}</p>
          
          <div *ngFor="let method of category.methods" class="method-block">
            <h3>{{ method.name }}</h3>
            <p>{{ method.description }}</p>
            
            <div class="syntax">
              <strong>Syntax:</strong>
              <code>{{ method.syntax }}</code>
            </div>
            
            <pre><code class="language-javascript">{{ method.example }}</code></pre>
            
            <app-jsq-playground 
              *ngIf="method.playground"
              [initialData]="method.playground.data"
              [initialExpression]="method.playground.expression"
            ></app-jsq-playground>
          </div>
        </div>
        
        <div class="method-chaining-section">
          <h2>Method Chaining</h2>
          <p>All methods that return collections return new SmartDollar instances, enabling fluent chaining:</p>
          
          <pre><code class="language-javascript">$.users
  .filter(u => u.active)
  .sortBy("joinDate")
  .take(10)
  .pluck("email")
  .join(", ")</code></pre>
          
          <app-jsq-playground 
            [initialData]='[{"name": "Alice", "score": 85, "active": true}, {"name": "Bob", "score": 92, "active": false}, {"name": "Charlie", "score": 78, "active": true}, {"name": "David", "score": 95, "active": true}]'
            [initialExpression]="methodChainingExpression"
          ></app-jsq-playground>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toc {
      background: var(--surface);
      padding: 1.5rem;
      border-radius: 0.5rem;
      margin: 2rem 0;
      
      h2 {
        margin-top: 0;
        font-size: 1.25rem;
      }
      
      ul {
        list-style: none;
        padding-left: 0;
        
        li {
          margin-bottom: 0.5rem;
          
          a {
            color: var(--primary-color);
            text-decoration: none;
            
            &:hover {
              text-decoration: underline;
            }
          }
        }
      }
    }
    
    .method-category {
      margin-top: 3rem;
    }
    
    .method-block {
      margin: 2rem 0;
      padding: 1.5rem;
      background: var(--surface);
      border-radius: 0.5rem;
      
      h3 {
        margin-top: 0;
        color: var(--primary-color);
      }
      
      .syntax {
        margin: 1rem 0;
        padding: 0.5rem;
        background: var(--code-bg);
        border-radius: 0.25rem;
        
        code {
          background: none;
          padding: 0;
        }
      }
    }
    
    .method-chaining-section {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid var(--border-color);
    }
  `]
})
export class SmartDollarMethodsComponent implements OnInit {
  methodChainingExpression = '$.filter(u => u.active).sortBy("score").reverse().pluck("name")';
  
  categories: MethodCategory[] = [
    {
      name: 'Array Methods',
      description: 'Core array operations for filtering, transforming, and manipulating data',
      methods: [
        {
          name: 'map(fn)',
          description: 'Transforms each element in the array using the provided function.',
          syntax: '$.array.map(fn)',
          example: `$.users.map(user => user.name)
// Input: [{name: "Alice"}, {name: "Bob"}]
// Output: ["Alice", "Bob"]`,
          playground: {
            data: [{name: "Alice", age: 25}, {name: "Bob", age: 30}],
            expression: '$.map(user => ({ name: user.name, adult: user.age >= 18 }))'
          }
        },
        {
          name: 'filter(fn)',
          description: 'Filters elements based on the predicate function.',
          syntax: '$.array.filter(predicate)',
          example: `$.numbers.filter(n => n > 5)
// Input: [3, 6, 8, 2, 9]
// Output: [6, 8, 9]`,
          playground: {
            data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            expression: '$.filter(n => n % 2 === 0)'
          }
        },
        {
          name: 'find(fn)',
          description: 'Returns the first element that satisfies the predicate.',
          syntax: '$.array.find(predicate)',
          example: `$.users.find(u => u.role === "admin")
// Input: [{name: "Alice", role: "user"}, {name: "Bob", role: "admin"}]
// Output: {name: "Bob", role: "admin"}`,
          playground: {
            data: [{id: 1, status: "pending"}, {id: 2, status: "active"}, {id: 3, status: "active"}],
            expression: '$.find(item => item.status === "active")'
          }
        },
        {
          name: 'reduce(fn, initial)',
          description: 'Reduces the array to a single value.',
          syntax: '$.array.reduce(reducer, initialValue)',
          example: `$.numbers.reduce((sum, n) => sum + n, 0)
// Input: [1, 2, 3, 4, 5]
// Output: 15`,
          playground: {
            data: [1, 2, 3, 4, 5],
            expression: '$.reduce((acc, val) => acc + val, 0)'
          }
        },
        {
          name: 'flatten()',
          description: 'Flattens the array by one level.',
          syntax: '$.array.flatten()',
          example: `$.nested.flatten()
// Input: [[1, 2], [3, [4]], 5]
// Output: [1, 2, 3, [4], 5]`
        },
        {
          name: 'flattenDeep()',
          description: 'Recursively flattens the array to a single level.',
          syntax: '$.array.flattenDeep()',
          example: `$.deepNested.flattenDeep()
// Input: [[1, [2, [3, [4]]]], 5]
// Output: [1, 2, 3, 4, 5]`,
          playground: {
            data: [[1, 2], [3, [4, [5]]], 6, [[7, 8]]],
            expression: '$.flattenDeep()'
          }
        },
        {
          name: 'compact()',
          description: 'Removes falsy values from the array.',
          syntax: '$.array.compact()',
          example: `$.mixed.compact()
// Input: [0, 1, false, 2, "", 3, null, undefined, 4]
// Output: [1, 2, 3, 4]`,
          playground: {
            data: [0, 1, false, 2, "", 3, null, undefined, 4, NaN, 5],
            expression: '$.compact()'
          }
        }
      ]
    },
    {
      name: 'Collection Methods',
      description: 'Lodash-like methods for advanced data manipulation',
      methods: [
        {
          name: 'where(property, value)',
          description: 'Filters collection by property matching.',
          syntax: '$.collection.where(property, value)',
          example: `$.products.where("category", "electronics")
// Input: [{name: "Phone", category: "electronics"}, {name: "Book", category: "media"}]
// Output: [{name: "Phone", category: "electronics"}]`,
          playground: {
            data: [{name: "iPhone", brand: "Apple"}, {name: "Galaxy", brand: "Samsung"}, {name: "MacBook", brand: "Apple"}],
            expression: '$.where("brand", "Apple")'
          }
        },
        {
          name: 'pluck(property)',
          description: 'Extracts property values from collection items.',
          syntax: '$.collection.pluck(property)',
          example: `$.users.pluck("email")
// Input: [{name: "Alice", email: "alice@example.com"}, {name: "Bob", email: "bob@example.com"}]
// Output: ["alice@example.com", "bob@example.com"]`,
          playground: {
            data: [{id: 1, title: "First Post"}, {id: 2, title: "Second Post"}, {id: 3, title: "Third Post"}],
            expression: '$.pluck("title")'
          }
        },
        {
          name: 'sortBy(iteratee)',
          description: 'Sorts collection by iteratee result.',
          syntax: '$.collection.sortBy(iteratee)',
          example: `$.users.sortBy("age")
// or with function:
$.users.sortBy(u => u.lastName)`,
          playground: {
            data: [{name: "Charlie", age: 35}, {name: "Alice", age: 25}, {name: "Bob", age: 30}],
            expression: '$.sortBy("age")'
          }
        },
        {
          name: 'groupBy(iteratee)',
          description: 'Groups collection items by iteratee result.',
          syntax: '$.collection.groupBy(iteratee)',
          example: `$.sales.groupBy(s => s.category)
// Returns object with categories as keys`,
          playground: {
            data: [{product: "A", category: "food"}, {product: "B", category: "tech"}, {product: "C", category: "food"}],
            expression: '$.groupBy(item => item.category)'
          }
        },
        {
          name: 'uniqBy(iteratee)',
          description: 'Returns unique elements based on iteratee.',
          syntax: '$.collection.uniqBy(iteratee)',
          example: `$.users.uniqBy(u => u.email)
// Removes duplicate emails`,
          playground: {
            data: [{id: 1, email: "alice@example.com"}, {id: 2, email: "bob@example.com"}, {id: 3, email: "alice@example.com"}],
            expression: '$.uniqBy(user => user.email)'
          }
        },
        {
          name: 'chunk(size)',
          description: 'Splits array into chunks of given size.',
          syntax: '$.array.chunk(size)',
          example: `$.items.chunk(3)
// Input: [1, 2, 3, 4, 5, 6, 7, 8]
// Output: [[1, 2, 3], [4, 5, 6], [7, 8]]`,
          playground: {
            data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            expression: '$.chunk(3)'
          }
        },
        {
          name: 'orderBy(iteratees, orders)',
          description: 'Multi-field sorting with order specification.',
          syntax: '$.collection.orderBy(iteratees, orders)',
          example: `$.data.orderBy(["category", "price"], ["asc", "desc"])
// Sorts by category ascending, then price descending`,
          playground: {
            data: [{name: "A", score: 85, date: "2024-01-15"}, {name: "B", score: 92, date: "2024-01-10"}, {name: "C", score: 85, date: "2024-01-20"}],
            expression: '$.orderBy(["score", "date"], ["desc", "asc"])'
          }
        }
      ]
    },
    {
      name: 'Mathematical Methods',
      description: 'Methods for mathematical operations and statistics',
      methods: [
        {
          name: 'sum(key)',
          description: 'Calculates sum of array values.',
          syntax: '$.array.sum(key?)',
          example: `$.numbers.sum()
// or with property:
$.orders.sum("amount")`,
          playground: {
            data: [{product: "A", price: 10.50}, {product: "B", price: 25.00}, {product: "C", price: 15.75}],
            expression: '$.sum("price")'
          }
        },
        {
          name: 'mean()',
          description: 'Calculates average of array values.',
          syntax: '$.array.mean()',
          example: `$.scores.mean()
// Input: [80, 90, 85, 95, 88]
// Output: 87.6`
        },
        {
          name: 'min() / max()',
          description: 'Returns minimum/maximum value in array.',
          syntax: '$.array.min() / $.array.max()',
          example: `$.prices.min()  // 10.99
$.prices.max()  // 199.99`
        },
        {
          name: 'minBy(iteratee) / maxBy(iteratee)',
          description: 'Returns element with minimum/maximum iteratee result.',
          syntax: '$.collection.minBy(iteratee) / $.collection.maxBy(iteratee)',
          example: `$.products.minBy(p => p.price)
$.students.maxBy(s => s.score)`
        }
      ]
    },
    {
      name: 'Object Methods',
      description: 'Methods for working with objects',
      methods: [
        {
          name: 'keys() / values() / entries()',
          description: 'Object property access methods.',
          syntax: '$.object.keys() / $.object.values() / $.object.entries()',
          example: `$.config.keys()     // ["host", "port", "secure"]
$.config.values()   // ["localhost", 3000, true]
$.config.entries()  // [["host", "localhost"], ["port", 3000], ["secure", true]]`,
          playground: {
            data: {name: "Alice", age: 25, city: "New York"},
            expression: '$.entries()'
          }
        },
        {
          name: 'pick(keys) / omit(keys)',
          description: 'Select or exclude specific object keys.',
          syntax: '$.object.pick(keys) / $.object.omit(keys)',
          example: `$.user.pick(['name', 'email'])
$.user.omit(['password', 'secret'])`
        },
        {
          name: 'assign(...sources)',
          description: 'Merges properties from source objects.',
          syntax: '$.object.assign(...sources)',
          example: `$.defaults.assign({timeout: 5000}, {retry: 3})`
        }
      ]
    },
    {
      name: 'Utility Methods',
      description: 'General utility methods for various operations',
      methods: [
        {
          name: 'pipe(...fns)',
          description: 'Chains multiple functions.',
          syntax: '$.value.pipe(...functions)',
          example: `$.data.pipe(
  arr => arr.filter(x => x > 0),
  arr => arr.map(x => x * 2),
  arr => arr.slice(0, 5)
)`
        },
        {
          name: 'tap(fn)',
          description: 'Executes side effect without changing value.',
          syntax: '$.value.tap(function)',
          example: `$.data
  .tap(console.log)  // Logs the data
  .filter(x => x > 10)
  .tap(filtered => console.log(\`Filtered to \${filtered.length} items\`))`
        },
        {
          name: 'isEmpty()',
          description: 'Checks if value is empty.',
          syntax: '$.value.isEmpty()',
          example: `$.array.isEmpty()   // [] => true
$.string.isEmpty()  // "" => true
$.object.isEmpty()  // {} => true`
        }
      ]
    },
    {
      name: 'Random Methods',
      description: 'Methods for random selection and shuffling',
      methods: [
        {
          name: 'sample() / sampleSize(n)',
          description: 'Random element selection.',
          syntax: '$.array.sample() / $.array.sampleSize(n)',
          example: `$.options.sample()        // Random single element
$.options.sampleSize(3)   // 3 random elements`
        },
        {
          name: 'shuffle()',
          description: 'Returns shuffled copy of array.',
          syntax: '$.array.shuffle()',
          example: `$.deck.shuffle()
// Randomly reorders all elements`,
          playground: {
            data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            expression: '$.shuffle()'
          }
        }
      ]
    },
    {
      name: 'Async Methods',
      description: 'Methods for asynchronous operations',
      methods: [
        {
          name: 'mapAsync(fn) / mapAsyncSeq(fn)',
          description: 'Async transformation methods.',
          syntax: '$.array.mapAsync(asyncFn) / $.array.mapAsyncSeq(asyncFn)',
          example: `// Parallel execution
await $.urls.mapAsync(async url => {
  const res = await fetch(url)
  return await res.json()
})

// Sequential execution
await $.items.mapAsyncSeq(async item => {
  await delay(100)  // Rate limiting
  return await processItem(item)
})`
        },
        {
          name: 'forEachAsync(fn) / forEachAsyncSeq(fn)',
          description: 'Async iteration methods.',
          syntax: '$.array.forEachAsync(asyncFn) / $.array.forEachAsyncSeq(asyncFn)',
          example: `// Parallel execution
await $.tasks.forEachAsync(async task => {
  await processTask(task)
})

// Sequential execution
await $.steps.forEachAsyncSeq(async step => {
  console.log(\`Processing step: \${step.name}\`)
  await executeStep(step)
})`
        }
      ]
    }
  ];

  constructor(
    private codeHighlight: CodeHighlightService
  ) {}

  ngOnInit() {
    setTimeout(() => this.codeHighlight.highlightAll(), 0);
  }

  getCategoryId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-');
  }
}