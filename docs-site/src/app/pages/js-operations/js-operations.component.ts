import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JsqPlaygroundComponent } from '../../components/jsq-playground/jsq-playground.component';
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
  selector: 'app-js-operations',
  standalone: true,
  imports: [CommonModule, JsqPlaygroundComponent],
  template: `
    <div class="container-with-sidebar">
      <aside class="sidebar">
        <nav class="sidebar-nav">
          <h2>Operations</h2>
          <div class="category-group" *ngFor="let category of categories">
            <button 
              class="category-header" 
              (click)="toggleCategory(category.name)"
              [class.expanded]="isCategoryExpanded(category.name)"
            >
              <span class="category-arrow">{{ isCategoryExpanded(category.name) ? '▼' : '▶' }}</span>
              {{ category.name }}
              <span class="method-count">({{ category.methods.length }})</span>
            </button>
            <ul class="method-list" *ngIf="isCategoryExpanded(category.name)">
              <li *ngFor="let method of category.methods">
                <a 
                  [href]="'#' + getMethodId(category.name, method.name)" 
                  (click)="scrollToMethod($event, category.name, method.name)"
                  [class.active]="isMethodActive(category.name, method.name)"
                >
                  {{ method.name.split('(')[0] }}
                </a>
              </li>
            </ul>
          </div>
          <div class="category-group">
            <a 
              href="#usage-note" 
              (click)="scrollToSection($event, 'usage-note')"
              class="special-section"
              [class.active]="activeSection === 'usage-note'"
            >
              Direct JavaScript Access
            </a>
          </div>
          <div class="category-group">
            <a 
              href="#combining" 
              (click)="scrollToSection($event, 'combining')"
              class="special-section"
              [class.active]="activeSection === 'combining'"
            >
              Combining with jsq Features
            </a>
          </div>
        </nav>
      </aside>
      
      <div class="main-content">
        <div class="prose">
          <h1>JavaScript Built-in Operations</h1>
          <p>jsq provides full access to JavaScript's built-in objects and their methods. This means you can use all standard JavaScript operations directly in your queries, including Array methods, Object utilities, Math functions, String operations, and more.</p>
          
          <div class="usage-note" id="usage-note">
            <h2>Direct JavaScript Access</h2>
            <p>All JavaScript built-in objects are available in jsq expressions:</p>
            
            <h3>Using Built-in Methods</h3>
            <pre><code class="language-javascript">// Array methods
$.map(n => n * 2).filter(n => n > 5)

// Object methods
Object.keys($).length
Object.entries($).map(([k, v]) => ({{ '{' }} key: k, value: v {{ '}' }}))

// Math operations
$.map(n => Math.sqrt(n))
Math.max(...$)

// String methods
$.toLowerCase().split(' ')
$.users.map(u => u.name.toUpperCase())</code></pre>
          </div>

          <div *ngFor="let category of categories" class="method-category">
            <h2 [id]="getCategoryId(category.name)">{{ category.name }}</h2>
            <p>{{ category.description }}</p>
            
            <div *ngFor="let method of category.methods" class="method-block" [id]="getMethodId(category.name, method.name)">
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

          <div class="combining-section" id="combining">
            <h2>Combining with jsq Features</h2>
            <p>JavaScript built-in operations seamlessly integrate with jsq's Smart Dollar and lodash methods:</p>
            
            <pre><code class="language-javascript">{{ getCombiningExample() }}</code></pre>
            
            <app-jsq-playground 
              [initialData]='[{"name": "Alice Smith", "scores": [85, 92, 88]}, {"name": "Bob Johnson", "scores": [78, 85, 90]}, {"name": "Charlie Brown", "scores": [92, 94, 96]}]'
              [initialExpression]="getCombinedExpression()"
            ></app-jsq-playground>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container-with-sidebar {
      display: flex;
      gap: 0;
      max-width: 1400px;
      margin: 0 auto;
      position: relative;
    }
    
    .sidebar {
      position: sticky;
      top: 0;
      left: 0;
      width: 280px;
      height: 100vh;
      background: var(--surface);
      border-right: 1px solid var(--border-color);
      overflow-y: auto;
      transition: width 0.3s ease, transform 0.3s ease;
      z-index: 10;
      
      &.sidebar-collapsed {
        width: 50px;
      }
      
      @media (max-width: 1024px) {
        position: fixed;
        transform: translateX(-100%);
        
        &:not(.sidebar-collapsed) {
          transform: translateX(0);
        }
      }
    }
    
    .sidebar-toggle {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      color: var(--text-color);
      font-size: 1.25rem;
      z-index: 1;
      
      &:hover {
        color: var(--primary-color);
      }
      
      @media (max-width: 1024px) {
        position: fixed;
        top: 1rem;
        left: 1rem;
        background: var(--surface);
        border: 1px solid var(--border-color);
        border-radius: 0.25rem;
        z-index: 100;
      }
    }
    
    .toggle-icon {
      display: block;
      width: 24px;
      height: 24px;
      line-height: 24px;
      text-align: center;
    }
    
    .sidebar-nav {
      padding: 3rem 1.5rem 2rem;
      
      h2 {
        margin: 0 0 1rem;
        font-size: 1.25rem;
        color: var(--text-color);
      }
    }
    
    .category-group {
      margin-bottom: 1rem;
    }
    
    .category-header {
      width: 100%;
      background: transparent;
      border: none;
      padding: 0.5rem 0.75rem;
      margin: 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-color);
      font-size: 0.9rem;
      font-weight: 600;
      text-align: left;
      border-radius: 0.25rem;
      transition: background-color 0.2s;
      
      &:hover {
        background: var(--code-bg);
      }
      
      &.expanded {
        color: var(--primary-color);
      }
    }
    
    .category-arrow {
      font-size: 0.75rem;
      transition: transform 0.2s;
    }
    
    .method-count {
      margin-left: auto;
      font-size: 0.75rem;
      opacity: 0.7;
    }
    
    .method-list {
      list-style: none;
      padding: 0;
      margin: 0.25rem 0 0 1.5rem;
      
      li {
        margin: 0;
        
        a {
          display: block;
          padding: 0.375rem 0.75rem;
          color: var(--text-color);
          text-decoration: none;
          font-size: 0.875rem;
          border-radius: 0.25rem;
          transition: all 0.2s;
          opacity: 0.8;
          
          &:hover {
            background: var(--code-bg);
            opacity: 1;
          }
          
          &.active {
            background: var(--primary-color);
            color: white;
            opacity: 1;
          }
        }
      }
    }
    
    .special-section {
      display: block;
      padding: 0.5rem 0.75rem;
      color: var(--text-color);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 600;
      border-radius: 0.25rem;
      transition: all 0.2s;
      
      &:hover {
        background: var(--code-bg);
      }
      
      &.active {
        background: var(--primary-color);
        color: white;
      }
    }
    
    .main-content {
      flex: 1;
      min-width: 0;
      padding: 2rem;
      transition: margin-left 0.3s ease;
      
      &.sidebar-collapsed {
        @media (min-width: 1025px) {
          margin-left: -230px;
        }
      }
      
      @media (max-width: 1024px) {
        margin-left: 0;
      }
    }
    
    .usage-note {
      background: var(--surface);
      padding: 2rem;
      border-radius: 0.5rem;
      margin: 2rem 0;
      scroll-margin-top: 2rem;
      
      h2 {
        margin-top: 0;
      }
      
      h3 {
        font-size: 1.125rem;
        margin-top: 1.5rem;
      }
    }
    
    .method-category {
      margin-top: 3rem;
      scroll-margin-top: 2rem;
    }
    
    .method-block {
      margin: 2rem 0;
      padding: 1.5rem;
      background: var(--surface);
      border-radius: 0.5rem;
      scroll-margin-top: 2rem;
      
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
    
    .combining-section {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid var(--border-color);
      scroll-margin-top: 2rem;
    }
  `]
})
export class JsOperationsComponent implements OnInit {
  expandedCategories: Set<string> = new Set();
  activeCategory: string = '';
  activeMethod: string = '';
  activeSection: string = '';
  
  categories: MethodCategory[] = [
    {
      name: 'Array Operations',
      description: 'JavaScript\'s built-in Array methods for data manipulation',
      methods: [
        {
          name: 'Array.prototype.map()',
          description: 'Creates a new array with the results of calling a function on every element.',
          syntax: 'array.map(callback(element, index, array))',
          example: `// Double each number
[1, 2, 3].map(n => n * 2)
// Output: [2, 4, 6]

// Extract property
$.users.map(user => user.name)`,
          playground: {
            data: [{name: "Alice", age: 25}, {name: "Bob", age: 30}, {name: "Charlie", age: 28}],
            expression: '$.map(user => ({ ...user, ageGroup: user.age < 30 ? "20s" : "30s" }))'
          }
        },
        {
          name: 'Array.prototype.filter()',
          description: 'Creates a new array with all elements that pass the test.',
          syntax: 'array.filter(callback(element, index, array))',
          example: `// Filter even numbers
[1, 2, 3, 4, 5].filter(n => n % 2 === 0)
// Output: [2, 4]`,
          playground: {
            data: [{product: "Apple", price: 1.5, inStock: true}, {product: "Banana", price: 0.8, inStock: false}, {product: "Orange", price: 2.0, inStock: true}],
            expression: '$.filter(item => item.inStock && item.price < 2)'
          }
        },
        {
          name: 'Array.prototype.reduce()',
          description: 'Reduces array to a single value by calling reducer function.',
          syntax: 'array.reduce(callback(accumulator, currentValue, index, array), initialValue)',
          example: `// Sum all numbers
[1, 2, 3, 4].reduce((sum, n) => sum + n, 0)
// Output: 10

// Group by property
$.reduce((groups, item) => {
  const key = item.category;
  groups[key] = groups[key] || [];
  groups[key].push(item);
  return groups;
}, {})`,
          playground: {
            data: [{type: "income", amount: 1000}, {type: "expense", amount: 200}, {type: "income", amount: 500}, {type: "expense", amount: 300}],
            expression: '$.reduce((acc, item) => ({ ...acc, [item.type]: (acc[item.type] || 0) + item.amount }), {})'
          }
        },
        {
          name: 'Array.prototype.find()',
          description: 'Returns the first element that satisfies the testing function.',
          syntax: 'array.find(callback(element, index, array))',
          example: `// Find first even number
[1, 3, 5, 4, 6].find(n => n % 2 === 0)
// Output: 4`,
          playground: {
            data: [{id: 1, status: "pending"}, {id: 2, status: "completed"}, {id: 3, status: "pending"}],
            expression: '$.find(item => item.status === "completed")'
          }
        },
        {
          name: 'Array.prototype.findIndex()',
          description: 'Returns the index of the first element that satisfies the testing function.',
          syntax: 'array.findIndex(callback(element, index, array))',
          example: `// Find index of first negative number
[5, 12, -8, 130, 44].findIndex(n => n < 0)
// Output: 2`,
          playground: {
            data: ["apple", "banana", "cherry", "date"],
            expression: '$.findIndex(fruit => fruit.startsWith("c"))'
          }
        },
        {
          name: 'Array.prototype.every()',
          description: 'Tests whether all elements pass the test.',
          syntax: 'array.every(callback(element, index, array))',
          example: `// Check if all numbers are positive
[1, 2, 3, 4].every(n => n > 0)
// Output: true`,
          playground: {
            data: [{name: "Task 1", completed: true}, {name: "Task 2", completed: true}, {name: "Task 3", completed: false}],
            expression: '({ allCompleted: $.every(task => task.completed), anyCompleted: $.some(task => task.completed) })'
          }
        },
        {
          name: 'Array.prototype.some()',
          description: 'Tests whether at least one element passes the test.',
          syntax: 'array.some(callback(element, index, array))',
          example: `// Check if any number is negative
[1, 2, -3, 4].some(n => n < 0)
// Output: true`,
          playground: {
            data: [{role: "admin", active: false}, {role: "user", active: true}, {role: "guest", active: true}],
            expression: '$.some(user => user.role === "admin" && user.active)'
          }
        },
        {
          name: 'Array.prototype.sort()',
          description: 'Sorts elements in place and returns the array.',
          syntax: 'array.sort(compareFunction(a, b))',
          example: `// Sort numbers ascending
[3, 1, 4, 1, 5].sort((a, b) => a - b)
// Output: [1, 1, 3, 4, 5]

// Sort strings
['banana', 'apple', 'cherry'].sort()`,
          playground: {
            data: [{name: "Charlie", score: 85}, {name: "Alice", score: 92}, {name: "Bob", score: 88}],
            expression: '[...$].sort((a, b) => b.score - a.score)'
          }
        },
        {
          name: 'Array.prototype.flatMap()',
          description: 'Maps each element and flattens the result by one level.',
          syntax: 'array.flatMap(callback(element, index, array))',
          example: `// Split and flatten
["hello world", "foo bar"].flatMap(str => str.split(' '))
// Output: ["hello", "world", "foo", "bar"]`,
          playground: {
            data: [{name: "Alice", hobbies: ["reading", "gaming"]}, {name: "Bob", hobbies: ["cooking"]}],
            expression: '$.flatMap(person => person.hobbies.map(hobby => ({ person: person.name, hobby })))'
          }
        },
        {
          name: 'Array.from()',
          description: 'Creates a new Array instance from an iterable or array-like object.',
          syntax: 'Array.from(iterable, mapFn, thisArg)',
          example: `// Create array from string
Array.from('hello')
// Output: ['h', 'e', 'l', 'l', 'o']

// Generate sequence
Array.from({length: 5}, (_, i) => i * 2)
// Output: [0, 2, 4, 6, 8]`,
          playground: {
            data: 5,
            expression: 'Array.from({length: $}, (_, i) => ({ id: i + 1, value: Math.pow(2, i) }))'
          }
        },
        {
          name: 'Array.prototype.includes()',
          description: 'Determines whether an array includes a certain value.',
          syntax: 'array.includes(searchElement, fromIndex)',
          example: `// Check if array includes value
[1, 2, 3].includes(2)
// Output: true

['a', 'b', 'c'].includes('d')
// Output: false`,
          playground: {
            data: ["javascript", "python", "ruby", "go"],
            expression: '({ hasJS: $.includes("javascript"), hasJava: $.includes("java") })'
          }
        },
        {
          name: 'Array.prototype.join()',
          description: 'Joins all elements into a string.',
          syntax: 'array.join(separator)',
          example: `// Join with comma
['a', 'b', 'c'].join(', ')
// Output: "a, b, c"

// Join with custom separator
[2024, 1, 15].join('-')
// Output: "2024-1-15"`,
          playground: {
            data: [{firstName: "John", lastName: "Doe"}, {firstName: "Jane", lastName: "Smith"}],
            expression: '$.map(p => [p.firstName, p.lastName].join(" ")).join(", ")'
          }
        },
        {
          name: 'Array.prototype.slice()',
          description: 'Returns a shallow copy of a portion of an array.',
          syntax: 'array.slice(start, end)',
          example: `// Get subset of array
[1, 2, 3, 4, 5].slice(1, 4)
// Output: [2, 3, 4]

// Get last 2 elements
[1, 2, 3, 4, 5].slice(-2)
// Output: [4, 5]`,
          playground: {
            data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            expression: '({ weekdays: $.slice(0, 5), weekend: $.slice(-2) })'
          }
        },
        {
          name: 'Array.prototype.concat()',
          description: 'Merges arrays and returns new array.',
          syntax: 'array.concat(value1, value2, ...)',
          example: `// Concatenate arrays
[1, 2].concat([3, 4], [5, 6])
// Output: [1, 2, 3, 4, 5, 6]

// Add single values
[1, 2].concat(3, 4)
// Output: [1, 2, 3, 4]`,
          playground: {
            data: [{type: "fruit", items: ["apple", "banana"]}, {type: "vegetable", items: ["carrot", "lettuce"]}],
            expression: '$.map(cat => cat.items).reduce((all, items) => all.concat(items), [])'
          }
        }
      ]
    },
    {
      name: 'Object Operations',
      description: 'JavaScript\'s Object static methods for object manipulation',
      methods: [
        {
          name: 'Object.keys()',
          description: 'Returns an array of object\'s own enumerable property names.',
          syntax: 'Object.keys(obj)',
          example: `// Get object keys
Object.keys({a: 1, b: 2, c: 3})
// Output: ['a', 'b', 'c']`,
          playground: {
            data: {name: "Alice", age: 25, city: "NYC", occupation: "Engineer"},
            expression: 'Object.keys($).filter(key => key.length > 3)'
          }
        },
        {
          name: 'Object.values()',
          description: 'Returns an array of object\'s own enumerable property values.',
          syntax: 'Object.values(obj)',
          example: `// Get object values
Object.values({a: 1, b: 2, c: 3})
// Output: [1, 2, 3]`,
          playground: {
            data: {math: 90, science: 85, english: 92, history: 88},
            expression: '({ scores: Object.values($), average: Object.values($).reduce((a, b) => a + b) / Object.values($).length })'
          }
        },
        {
          name: 'Object.entries()',
          description: 'Returns an array of object\'s own enumerable [key, value] pairs.',
          syntax: 'Object.entries(obj)',
          example: `// Get key-value pairs
Object.entries({a: 1, b: 2})
// Output: [['a', 1], ['b', 2]]`,
          playground: {
            data: {apple: 3, banana: 5, orange: 2},
            expression: 'Object.entries($).map(([fruit, count]) => `${count} ${fruit}${count > 1 ? "s" : ""}`)'
          }
        },
        {
          name: 'Object.fromEntries()',
          description: 'Creates an object from an array of key-value pairs.',
          syntax: 'Object.fromEntries(iterable)',
          example: `// Create object from entries
Object.fromEntries([['a', 1], ['b', 2]])
// Output: {a: 1, b: 2}

// Transform object
const transformed = Object.fromEntries(
  Object.entries(obj).map(([k, v]) => [k, v * 2])
)`,
          playground: {
            data: [["name", "Bob"], ["age", 30], ["city", "Boston"]],
            expression: 'Object.fromEntries($)'
          }
        },
        {
          name: 'Object.assign()',
          description: 'Copies values from source objects to target object.',
          syntax: 'Object.assign(target, ...sources)',
          example: `// Merge objects
Object.assign({}, {a: 1}, {b: 2}, {a: 3})
// Output: {a: 3, b: 2}

// Clone object
Object.assign({}, original)`,
          playground: {
            data: {name: "User", settings: {theme: "light"}},
            expression: 'Object.assign({}, $, {id: 123, settings: {theme: "dark", lang: "en"}})'
          }
        },
        {
          name: 'Object.hasOwn()',
          description: 'Returns true if object has the specified property as its own.',
          syntax: 'Object.hasOwn(obj, prop)',
          example: `// Check own property
Object.hasOwn({a: 1}, 'a')  // true
Object.hasOwn({}, 'toString')  // false`,
          playground: {
            data: {name: "Alice", age: 25},
            expression: '({ hasName: Object.hasOwn($, "name"), hasEmail: Object.hasOwn($, "email"), hasToString: Object.hasOwn($, "toString") })'
          }
        },
        {
          name: 'Object.freeze()',
          description: 'Freezes an object, preventing modifications.',
          syntax: 'Object.freeze(obj)',
          example: `// Freeze object
const frozen = Object.freeze({a: 1});
frozen.a = 2; // Silently fails
frozen.b = 3; // Silently fails`,
          playground: {
            data: {x: 10, y: 20},
            expression: 'const frozen = Object.freeze({...$}); ({ original: $, frozen, isFrozen: Object.isFrozen(frozen) })'
          }
        },
        {
          name: 'Object.seal()',
          description: 'Seals an object, preventing new properties but allowing modification.',
          syntax: 'Object.seal(obj)',
          example: `// Seal object
const sealed = Object.seal({a: 1});
sealed.a = 2; // Works
sealed.b = 3; // Silently fails`,
          playground: {
            data: {count: 0},
            expression: 'const sealed = Object.seal({...$}); sealed.count = 10; ({ original: $, sealed, isSealed: Object.isSealed(sealed) })'
          }
        }
      ]
    },
    {
      name: 'String Operations',
      description: 'JavaScript\'s String methods for text manipulation',
      methods: [
        {
          name: 'String.prototype.split()',
          description: 'Splits a string into an array of substrings.',
          syntax: 'string.split(separator, limit)',
          example: `// Split by space
"hello world".split(' ')
// Output: ['hello', 'world']

// Split with limit
"a-b-c-d".split('-', 2)
// Output: ['a', 'b']`,
          playground: {
            data: "user@example.com",
            expression: '({ parts: $.split("@"), username: $.split("@")[0], domain: $.split("@")[1] })'
          }
        },
        {
          name: 'String.prototype.replace()',
          description: 'Returns a new string with pattern replaced.',
          syntax: 'string.replace(pattern, replacement)',
          example: `// Replace first occurrence
"hello world".replace('o', '0')
// Output: "hell0 world"

// Replace with regex
"hello world".replace(/o/g, '0')
// Output: "hell0 w0rld"`,
          playground: {
            data: "Hello, World! Welcome to the World!",
            expression: '({ first: $.replace("World", "Universe"), all: $.replace(/World/g, "Universe") })'
          }
        },
        {
          name: 'String.prototype.trim()',
          description: 'Removes whitespace from both ends of string.',
          syntax: 'string.trim()',
          example: `// Remove whitespace
"  hello  ".trim()
// Output: "hello"

// Trim variants
str.trimStart() // left only
str.trimEnd()   // right only`,
          playground: {
            data: "   JavaScript   ",
            expression: '({ original: $, trimmed: $.trim(), trimStart: $.trimStart(), trimEnd: $.trimEnd() })'
          }
        },
        {
          name: 'String.prototype.padStart() / padEnd()',
          description: 'Pads string to a certain length.',
          syntax: 'string.padStart(targetLength, padString)',
          example: `// Pad with zeros
"5".padStart(3, '0')
// Output: "005"

// Pad end
"hello".padEnd(10, '.')
// Output: "hello....."`,
          playground: {
            data: "42",
            expression: '({ padded: $.padStart(5, "0"), id: "ID-" + $.padStart(6, "0"), loading: "Loading" + "".padEnd(3, ".") })'
          }
        },
        {
          name: 'String.prototype.includes()',
          description: 'Determines whether string contains the search string.',
          syntax: 'string.includes(searchString, position)',
          example: `// Check substring
"hello world".includes('world')
// Output: true

// Case sensitive
"Hello".includes('hello')
// Output: false`,
          playground: {
            data: "JavaScript is awesome",
            expression: '({ hasJS: $.includes("JavaScript"), hasJava: $.includes("Java"), hasPython: $.includes("Python") })'
          }
        },
        {
          name: 'String.prototype.startsWith() / endsWith()',
          description: 'Checks if string starts or ends with specified string.',
          syntax: 'string.startsWith(searchString, position)',
          example: `// Check prefix
"hello world".startsWith('hello')
// Output: true

// Check suffix
"image.png".endsWith('.png')
// Output: true`,
          playground: {
            data: ["index.html", "styles.css", "script.js", "image.png"],
            expression: '$.filter(file => file.endsWith(".js") || file.endsWith(".css"))'
          }
        },
        {
          name: 'String.prototype.match()',
          description: 'Matches string against a regular expression.',
          syntax: 'string.match(regexp)',
          example: `// Extract matches
"Price: $12.99".match(/\\d+\\.\\d+/)
// Output: ['12.99']

// Global match
"a1b2c3".match(/\\d/g)
// Output: ['1', '2', '3']`,
          playground: {
            data: "Contact: john.doe@example.com or call 555-1234",
            expression: '({ email: $.match(/[\\w.]+@[\\w.]+/)[0], phone: $.match(/\\d{3}-\\d{4}/)[0] })'
          }
        },
        {
          name: 'Template Literals',
          description: 'String interpolation using backticks.',
          syntax: '`text ${expression} text`',
          example: `// String interpolation
const name = "Alice";
const age = 25;
\`Hello, my name is \${name} and I'm \${age} years old\``,
          playground: {
            data: {name: "Bob", role: "Developer", years: 5},
            expression: '`${$.name} is a ${$.role} with ${$.years} years of experience`'
          }
        }
      ]
    },
    {
      name: 'Math Operations',
      description: 'JavaScript\'s Math object for mathematical operations',
      methods: [
        {
          name: 'Math.max() / Math.min()',
          description: 'Returns the largest/smallest of the given numbers.',
          syntax: 'Math.max(...values)',
          example: `// Find maximum
Math.max(1, 5, 3)
// Output: 5

// With array
Math.max(...[1, 5, 3])
// Output: 5`,
          playground: {
            data: [45, 67, 23, 89, 12, 78],
            expression: '({ min: Math.min(...$), max: Math.max(...$), range: Math.max(...$) - Math.min(...$) })'
          }
        },
        {
          name: 'Math.round() / Math.floor() / Math.ceil()',
          description: 'Rounds numbers to integers.',
          syntax: 'Math.round(x)',
          example: `Math.round(4.7)   // 5
Math.floor(4.7)   // 4
Math.ceil(4.3)    // 5
Math.trunc(4.7)   // 4`,
          playground: {
            data: [1.2, 2.7, 3.5, 4.1],
            expression: '$.map(n => ({ original: n, round: Math.round(n), floor: Math.floor(n), ceil: Math.ceil(n) }))'
          }
        },
        {
          name: 'Math.sqrt() / Math.pow()',
          description: 'Square root and exponentiation.',
          syntax: 'Math.sqrt(x)',
          example: `// Square root
Math.sqrt(16)     // 4

// Power
Math.pow(2, 3)    // 8
2 ** 3           // 8 (ES6)`,
          playground: {
            data: [1, 4, 9, 16, 25],
            expression: '$.map(n => ({ number: n, sqrt: Math.sqrt(n), squared: Math.pow(n, 2), cubed: n ** 3 }))'
          }
        },
        {
          name: 'Math.random()',
          description: 'Returns a random number between 0 and 1.',
          syntax: 'Math.random()',
          example: `// Random 0-1
Math.random()

// Random integer 1-10
Math.floor(Math.random() * 10) + 1

// Random from array
arr[Math.floor(Math.random() * arr.length)]`,
          playground: {
            data: ["rock", "paper", "scissors"],
            expression: '({ choice: $[Math.floor(Math.random() * $.length)], dice: Math.floor(Math.random() * 6) + 1 })'
          }
        },
        {
          name: 'Math.abs()',
          description: 'Returns the absolute value.',
          syntax: 'Math.abs(x)',
          example: `Math.abs(-5)      // 5
Math.abs(5)       // 5
Math.abs(-3.14)   // 3.14`,
          playground: {
            data: [-5, 3, -8, 12, -1],
            expression: '$.map(n => ({ value: n, absolute: Math.abs(n), distance: Math.abs(n - 0) }))'
          }
        },
        {
          name: 'Math trigonometric functions',
          description: 'Sin, cos, tan and other trigonometric functions.',
          syntax: 'Math.sin(x)',
          example: `Math.sin(Math.PI / 2)   // 1
Math.cos(0)             // 1
Math.tan(Math.PI / 4)   // ~1

// Convert degrees to radians
const rad = deg * (Math.PI / 180)`,
          playground: {
            data: [0, 30, 45, 60, 90],
            expression: '$.map(deg => ({ degrees: deg, radians: deg * (Math.PI / 180), sin: Math.sin(deg * Math.PI / 180).toFixed(3) }))'
          }
        }
      ]
    },
    {
      name: 'Date Operations',
      description: 'JavaScript\'s Date object for date/time manipulation',
      methods: [
        {
          name: 'Date Constructor and Parsing',
          description: 'Creating and parsing dates.',
          syntax: 'new Date()',
          example: `// Current date
new Date()

// From string
new Date('2024-01-15')

// From parts
new Date(2024, 0, 15) // Month is 0-indexed`,
          playground: {
            data: ["2024-01-15", "2024-06-30", "2024-12-25"],
            expression: '$.map(d => ({ date: d, parsed: new Date(d).toDateString(), dayOfWeek: new Date(d).toLocaleDateString("en", {weekday: "long"}) }))'
          }
        },
        {
          name: 'Date Methods',
          description: 'Getting and setting date components.',
          syntax: 'date.getFullYear()',
          example: `const date = new Date();
date.getFullYear()    // 2024
date.getMonth()       // 0-11
date.getDate()        // 1-31
date.getDay()         // 0-6 (Sun-Sat)
date.getHours()       // 0-23`,
          playground: {
            data: new Date().toISOString(),
            expression: 'const d = new Date($); ({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), dayName: d.toLocaleDateString("en", {weekday: "short"}) })'
          }
        },
        {
          name: 'Date Formatting',
          description: 'Converting dates to strings.',
          syntax: 'date.toISOString()',
          example: `const date = new Date();
date.toISOString()      // "2024-01-15T10:30:00.000Z"
date.toDateString()     // "Mon Jan 15 2024"
date.toLocaleDateString() // "1/15/2024"
date.toLocaleString()   // "1/15/2024, 10:30:00 AM"`,
          playground: {
            data: new Date().toISOString(),
            expression: 'const d = new Date($); ({ iso: d.toISOString(), date: d.toDateString(), local: d.toLocaleString(), time: d.toLocaleTimeString() })'
          }
        }
      ]
    },
    {
      name: 'JSON Operations',
      description: 'JavaScript\'s JSON object for serialization',
      methods: [
        {
          name: 'JSON.stringify()',
          description: 'Converts JavaScript value to JSON string.',
          syntax: 'JSON.stringify(value, replacer, space)',
          example: `// Basic stringify
JSON.stringify({a: 1, b: 2})
// Output: '{"a":1,"b":2}'

// Pretty print
JSON.stringify(obj, null, 2)

// With replacer
JSON.stringify(obj, ['name', 'age'])`,
          playground: {
            data: {name: "Alice", age: 25, password: "secret", meta: {created: new Date().toISOString()}},
            expression: '({ compact: JSON.stringify($), pretty: JSON.stringify($, null, 2), filtered: JSON.stringify($, ["name", "age"]) })'
          }
        },
        {
          name: 'JSON.parse()',
          description: 'Parses JSON string to JavaScript value.',
          syntax: 'JSON.parse(text, reviver)',
          example: `// Basic parse
JSON.parse('{"a": 1, "b": 2}')
// Output: {a: 1, b: 2}

// With reviver
JSON.parse(text, (key, value) => 
  typeof value === 'string' && /\\d{4}-\\d{2}-\\d{2}/.test(value) 
    ? new Date(value) 
    : value
)`,
          playground: {
            data: '{"users": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}], "count": 2}',
            expression: 'JSON.parse($)'
          }
        }
      ]
    },
    {
      name: 'Advanced Features',
      description: 'Modern JavaScript features available in jsq',
      methods: [
        {
          name: 'Destructuring',
          description: 'Extract values from arrays and objects.',
          syntax: 'const {a, b} = obj; const [x, y] = arr',
          example: `// Object destructuring
const {name, age} = user

// Array destructuring  
const [first, second] = array

// With defaults
const {name = 'Anonymous'} = user`,
          playground: {
            data: [{name: "Alice", details: {age: 25, city: "NYC"}}, {name: "Bob", details: {age: 30, city: "LA"}}],
            expression: '$.map(({name, details: {age, city}}) => `${name} (${age}) from ${city}`)'
          }
        },
        {
          name: 'Spread Operator',
          description: 'Expands elements or properties.',
          syntax: '...array or {...object}',
          example: `// Array spread
const combined = [...arr1, ...arr2]

// Object spread
const updated = {...original, newProp: 'value'}

// Function arguments
Math.max(...numbers)`,
          playground: {
            data: {base: {a: 1, b: 2}, extra: {c: 3}, override: {b: 5}},
            expression: '({...$.base, ...$.extra, ...$.override, d: 4})'
          }
        },
        {
          name: 'Arrow Functions',
          description: 'Concise function syntax.',
          syntax: '(params) => expression',
          example: `// Single parameter
array.map(x => x * 2)

// Multiple parameters
array.reduce((sum, n) => sum + n)

// Block body
array.map(x => {
  const doubled = x * 2;
  return doubled;
})`,
          playground: {
            data: [1, 2, 3, 4, 5],
            expression: '$.filter(n => n % 2 === 0).map(n => ({ value: n, squared: n ** 2 }))'
          }
        },
        {
          name: 'Optional Chaining',
          description: 'Safely access nested properties.',
          syntax: 'obj?.prop?.nested',
          example: `// Safe property access
user?.address?.city

// Safe method call
obj.method?.()

// Safe array access
arr?.[0]`,
          playground: {
            data: [{user: {name: "Alice", address: {city: "NYC"}}}, {user: {name: "Bob"}}, {user: null}],
            expression: '$.map(item => item.user?.address?.city || "No city")'
          }
        },
        {
          name: 'Nullish Coalescing',
          description: 'Default values for null/undefined.',
          syntax: 'value ?? defaultValue',
          example: `// Only null/undefined trigger default
null ?? 'default'        // 'default'
undefined ?? 'default'   // 'default'
0 ?? 'default'          // 0
'' ?? 'default'         // ''`,
          playground: {
            data: {a: null, b: undefined, c: 0, d: "", e: "value"},
            expression: 'Object.entries($).map(([k, v]) => ({ key: k, value: v ?? "default" }))'
          }
        }
      ]
    }
  ];

  constructor(
    private codeHighlight: CodeHighlightService
  ) {}

  ngOnInit() {
    setTimeout(() => this.codeHighlight.highlightAll(), 0);
    this.setupScrollListener();
    this.expandedCategories.add(this.categories[0].name);
  }

  getCategoryId(categoryName: string): string {
    return categoryName.toLowerCase().replace(/\s+/g, '-');
  }
  
  getMethodId(categoryName: string, methodName: string): string {
    const cleanMethodName = methodName.replace(/[^a-zA-Z0-9]/g, '');
    return `${this.getCategoryId(categoryName)}-${cleanMethodName.toLowerCase()}`;
  }
  
  toggleCategory(categoryName: string): void {
    if (this.expandedCategories.has(categoryName)) {
      this.expandedCategories.delete(categoryName);
    } else {
      this.expandedCategories.add(categoryName);
    }
  }
  
  isCategoryExpanded(categoryName: string): boolean {
    return this.expandedCategories.has(categoryName);
  }
  
  scrollToMethod(event: Event, categoryName: string, methodName: string): void {
    event.preventDefault();
    const elementId = this.getMethodId(categoryName, methodName);
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.activeCategory = categoryName;
      this.activeMethod = methodName;
      this.activeSection = '';
    }
  }
  
  scrollToSection(event: Event, sectionId: string): void {
    event.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.activeSection = sectionId;
      this.activeCategory = '';
      this.activeMethod = '';
    }
  }
  
  isMethodActive(categoryName: string, methodName: string): boolean {
    return this.activeCategory === categoryName && this.activeMethod === methodName;
  }
  
  private setupScrollListener(): void {
    let ticking = false;
    
    const updateActiveMethod = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const viewportHeight = window.innerHeight;
      const triggerPoint = scrollTop + viewportHeight * 0.3;
      
      let closestElement: { category: string; method: string; section: string; distance: number } | null = null;
      
      this.categories.forEach(category => {
        category.methods.forEach(method => {
          const elementId = this.getMethodId(category.name, method.name);
          const element = document.getElementById(elementId);
          if (element) {
            const rect = element.getBoundingClientRect();
            const elementTop = rect.top + scrollTop;
            const distance = Math.abs(elementTop - triggerPoint);
            
            if (!closestElement || distance < closestElement.distance) {
              closestElement = {
                category: category.name,
                method: method.name,
                section: '',
                distance: distance
              };
            }
          }
        });
      });
      
      const specialSections = ['usage-note', 'combining'];
      specialSections.forEach(sectionId => {
        const element = document.getElementById(sectionId);
        if (element) {
          const rect = element.getBoundingClientRect();
          const elementTop = rect.top + scrollTop;
          const distance = Math.abs(elementTop - triggerPoint);
          
          if (!closestElement || distance < closestElement.distance) {
            closestElement = {
              category: '',
              method: '',
              section: sectionId,
              distance: distance
            };
          }
        }
      });
      
      if (closestElement != null) {
        const castClosestElement = closestElement as { category: string; method: string; section: string; distance: number }
        this.activeCategory = castClosestElement.category;
        this.activeMethod = castClosestElement.method;
        this.activeSection = castClosestElement.section;
        
        if (castClosestElement.category && !this.expandedCategories.has(castClosestElement.category)) {
          this.expandedCategories.add(castClosestElement.category);
        }
      }
      
      ticking = false;
    };
    
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateActiveMethod);
        ticking = true;
      }
    });
  }

  getCombiningExample(): string {
    return `// Combine JS built-ins with Smart Dollar and lodash
const result = $.users
  .filter(u => u.active)                    // JS filter
  .map(u => ({                              // JS map
    ...u,
    fullName: \`\${u.firstName} \${u.lastName}\`,  // Template literal
    score: Math.round(u.score * 100)        // Math operation
  }))
  .sort((a, b) => b.score - a.score)        // JS sort

// Use with lodash
const grouped = _.groupBy(result, u => 
  Math.floor(u.score / 10) * 10            // Group by score range
)`;
  }

  getCombinedExpression(): string {
    return '$.map(student => ({ name: student.name.split(" ")[0], average: Math.round(student.scores.reduce((a, b) => a + b) / student.scores.length), grade: Math.max(...student.scores) >= 90 ? "A" : "B" }))';
  }
}