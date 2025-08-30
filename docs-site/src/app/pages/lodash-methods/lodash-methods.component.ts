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
  selector: 'app-lodash-methods',
  standalone: true,
  imports: [CommonModule, JsqPlaygroundComponent],
  template: `
    <div class="container">
      <div class="prose">
        <h1>Lodash Methods</h1>
        <p>jsq includes the complete lodash utility library, accessible through the underscore (<code>_</code>) namespace. This provides 60+ additional methods for data manipulation.</p>
        
        <div class="usage-note">
          <h2>Static vs Chained Usage</h2>
          <p>Most lodash methods can be used in two ways:</p>
          
          <h3>Static Usage</h3>
          <pre><code class="language-javascript">// Direct function calls
_.map([1, 2, 3], n => n * 2)
_.filter(users, u => u.active)</code></pre>
          
          <h3>Chained Usage</h3>
          <pre><code class="language-javascript">// Using the wrapper
_([1, 2, 3]).map(n => n * 2).filter(n => n > 2).value()
_(users).filter(u => u.active).sortBy('age').value()</code></pre>
        </div>

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

        <div class="combining-section">
          <h2>Combining with Smart Dollar</h2>
          <p>You can seamlessly combine lodash methods with Smart Dollar:</p>
          
          <pre><code class="language-javascript">{{ getCombiningExample() }}</code></pre>
          
          <app-jsq-playground 
            [initialData]='[{"name": "Alice", "dept": "Engineering", "salary": 80000}, {"name": "Bob", "dept": "Sales", "salary": 60000}, {"name": "Charlie", "dept": "Engineering", "salary": 90000}]'
            [initialExpression]="getGroupByExpression()"
          ></app-jsq-playground>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .usage-note {
      background: var(--surface);
      padding: 2rem;
      border-radius: 0.5rem;
      margin: 2rem 0;
      
      h2 {
        margin-top: 0;
      }
      
      h3 {
        font-size: 1.125rem;
        margin-top: 1.5rem;
      }
    }
    
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
    
    .combining-section {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid var(--border-color);
    }
  `]
})
export class LodashMethodsComponent implements OnInit {
  categories: MethodCategory[] = [
    {
      name: 'Array Methods',
      description: 'Core array operations from lodash',
      methods: [
        {
          name: '_.filter(collection, predicate)',
          description: 'Filters elements based on a predicate function.',
          syntax: '_.filter(collection, predicate)',
          example: `_.filter([1, 2, 3, 4], n => n > 2)
// Output: [3, 4]`,
          playground: {
            data: [{name: "Alice", active: true}, {name: "Bob", active: false}, {name: "Charlie", active: true}],
            expression: '_.filter($, user => user.active)'
          }
        },
        {
          name: '_.map(collection, iteratee)',
          description: 'Transforms each element in the collection.',
          syntax: '_.map(collection, iteratee)',
          example: `_.map([1, 2, 3], n => n * 2)
// Output: [2, 4, 6]`
        },
        {
          name: '_.reduce(collection, iteratee, accumulator)',
          description: 'Reduces collection to a single value.',
          syntax: '_.reduce(collection, iteratee, accumulator)',
          example: `_.reduce([1, 2, 3], (sum, n) => sum + n, 0)
// Output: 6`,
          playground: {
            data: [{category: "food", price: 10}, {category: "tech", price: 100}, {category: "food", price: 15}],
            expression: '_.reduce($, (result, item) => { result[item.category] = (result[item.category] || 0) + item.price; return result; }, {})'
          }
        },
        {
          name: '_.take(array, n)',
          description: 'Takes first n elements from array.',
          syntax: '_.take(array, n)',
          example: `_.take([1, 2, 3, 4, 5], 3)
// Output: [1, 2, 3]`
        },
        {
          name: '_.takeWhile(array, predicate)',
          description: 'Takes elements while predicate returns true.',
          syntax: '_.takeWhile(array, predicate)',
          example: `_.takeWhile([1, 2, 3, 4, 1], n => n < 3)
// Output: [1, 2]`,
          playground: {
            data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            expression: '_.takeWhile($, n => n <= 5)'
          }
        },
        {
          name: '_.compact(array)',
          description: 'Removes all falsy values from array.',
          syntax: '_.compact(array)',
          example: `_.compact([0, 1, false, 2, '', 3, null])
// Output: [1, 2, 3]`,
          playground: {
            data: [0, 1, false, 2, "", 3, null, undefined, 4, NaN],
            expression: '_.compact($)'
          }
        }
      ]
    },
    {
      name: 'Collection Methods',
      description: 'Advanced collection manipulation',
      methods: [
        {
          name: '_.pluck(collection, property)',
          description: 'Extracts property values from a collection of objects.',
          syntax: '_.pluck(collection, property)',
          example: `_.pluck([{name: 'Alice'}, {name: 'Bob'}], 'name')
// Output: ['Alice', 'Bob']`,
          playground: {
            data: [{id: 1, title: "First Post", views: 100}, {id: 2, title: "Second Post", views: 250}],
            expression: '_.pluck($, "title")'
          }
        },
        {
          name: '_.sortBy(collection, iteratee)',
          description: 'Sorts collection by iteratee result.',
          syntax: '_.sortBy(collection, iteratee)',
          example: `_.sortBy([{age: 30}, {age: 20}, {age: 25}], 'age')
// Output: [{age: 20}, {age: 25}, {age: 30}]`,
          playground: {
            data: [{name: "Charlie", score: 85}, {name: "Alice", score: 92}, {name: "Bob", score: 88}],
            expression: '_.sortBy($, "score")'
          }
        },
        {
          name: '_.groupBy(collection, iteratee)',
          description: 'Groups elements by iteratee result.',
          syntax: '_.groupBy(collection, iteratee)',
          example: `_.groupBy([1.2, 2.3, 2.4], Math.floor)
// Output: {1: [1.2], 2: [2.3, 2.4]}`,
          playground: {
            data: [{type: "fruit", name: "apple"}, {type: "vegetable", name: "carrot"}, {type: "fruit", name: "banana"}],
            expression: '_.groupBy($, "type")'
          }
        },
        {
          name: '_.uniqBy(array, iteratee)',
          description: 'Removes duplicates based on iteratee result.',
          syntax: '_.uniqBy(array, iteratee)',
          example: `_.uniqBy([{x: 1}, {x: 2}, {x: 1}], 'x')
// Output: [{x: 1}, {x: 2}]`,
          playground: {
            data: [{id: 1, email: "alice@example.com"}, {id: 2, email: "bob@example.com"}, {id: 3, email: "alice@example.com"}],
            expression: '_.uniqBy($, "email")'
          }
        },
        {
          name: '_.orderBy(collection, iteratees, orders)',
          description: 'Advanced sorting with multiple criteria and order directions.',
          syntax: '_.orderBy(collection, iteratees, orders)',
          example: `_.orderBy(users, ['age', 'name'], ['desc', 'asc'])
// Sorts by age descending, then name ascending`,
          playground: {
            data: [{name: "Alice", age: 25, score: 85}, {name: "Bob", age: 30, score: 85}, {name: "Charlie", age: 25, score: 90}],
            expression: '_.orderBy($, ["score", "age"], ["desc", "asc"])'
          }
        },
        {
          name: '_.shuffle(collection)',
          description: 'Returns shuffled copy of collection.',
          syntax: '_.shuffle(collection)',
          example: `_.shuffle([1, 2, 3, 4, 5])
// Output: [3, 1, 5, 2, 4] (random order)`,
          playground: {
            data: ["Alice", "Bob", "Charlie", "David", "Eve"],
            expression: '_.shuffle($)'
          }
        }
      ]
    },
    {
      name: 'Mathematical Methods',
      description: 'Statistical and mathematical operations',
      methods: [
        {
          name: '_.sum(array, iteratee)',
          description: 'Calculates sum of array values.',
          syntax: '_.sum(array, iteratee)',
          example: `_.sum([1, 2, 3, 4])
// Output: 10

_.sum([{n: 4}, {n: 6}], 'n')
// Output: 10`,
          playground: {
            data: [{product: "A", quantity: 2, price: 10}, {product: "B", quantity: 3, price: 15}],
            expression: '_.sum($, item => item.quantity * item.price)'
          }
        },
        {
          name: '_.mean(array)',
          description: 'Calculates average of array values.',
          syntax: '_.mean(array)',
          example: `_.mean([1, 2, 3, 4, 5])
// Output: 3`
        },
        {
          name: '_.maxBy(array, iteratee)',
          description: 'Returns element with maximum iteratee value.',
          syntax: '_.maxBy(array, iteratee)',
          example: `_.maxBy([{n: 3}, {n: 1}, {n: 4}], 'n')
// Output: {n: 4}`,
          playground: {
            data: [{name: "Alice", score: 85}, {name: "Bob", score: 92}, {name: "Charlie", score: 78}],
            expression: '_.maxBy($, "score")'
          }
        }
      ]
    },
    {
      name: 'Object Methods',
      description: 'Object manipulation and transformation',
      methods: [
        {
          name: '_.pick(object, ...keys)',
          description: 'Creates object with only specified keys.',
          syntax: '_.pick(object, ...keys)',
          example: `_.pick({a: 1, b: 2, c: 3}, ['a', 'c'])
// Output: {a: 1, c: 3}`,
          playground: {
            data: {name: "Alice", email: "alice@example.com", password: "secret", age: 25},
            expression: '_.pick($, ["name", "email"])'
          }
        },
        {
          name: '_.omit(object, ...keys)',
          description: 'Creates object without specified keys.',
          syntax: '_.omit(object, ...keys)',
          example: `_.omit({a: 1, b: 2, c: 3}, ['b'])
// Output: {a: 1, c: 3}`
        },
        {
          name: '_.defaults(...objects)',
          description: 'Fills in undefined properties.',
          syntax: '_.defaults(...objects)',
          example: `_.defaults({a: 1}, {a: 2, b: 3})
// Output: {a: 1, b: 3}`,
          playground: {
            data: {name: "User", settings: {theme: "light"}},
            expression: '_.defaults($, {name: "Anonymous", settings: {theme: "dark", notifications: true}})'
          }
        }
      ]
    },
    {
      name: 'String Methods',
      description: 'String case conversion and manipulation',
      methods: [
        {
          name: 'Case Conversion Methods',
          description: 'Convert strings to different cases.',
          syntax: '_.camelCase(string) / _.kebabCase(string) / _.snakeCase(string) / _.startCase(string)',
          example: `_.camelCase('foo-bar-baz')     // 'fooBarBaz'
_.kebabCase('fooBarBaz')        // 'foo-bar-baz'
_.snakeCase('fooBarBaz')        // 'foo_bar_baz'
_.startCase('foo-bar-baz')      // 'Foo Bar Baz'`,
          playground: {
            data: "hello-world_test CASE",
            expression: '({ camelCase: _.camelCase($), kebabCase: _.kebabCase($), snakeCase: _.snakeCase($), startCase: _.startCase($) })'
          }
        }
      ]
    },
    {
      name: 'Utility Methods',
      description: 'General utility functions',
      methods: [
        {
          name: '_.includes(collection, value, fromIndex)',
          description: 'Checks if collection includes value.',
          syntax: '_.includes(collection, value, fromIndex)',
          example: `_.includes([1, 2, 3], 2)              // true
_.includes({a: 1, b: 2}, 1)           // true
_.includes('hello', 'ell')            // true`,
          playground: {
            data: ["apple", "banana", "orange", "grape"],
            expression: '_.includes($, "banana")'
          }
        },
        {
          name: '_.range(start, end, step)',
          description: 'Creates array of numbers.',
          syntax: '_.range(start, end, step)',
          example: `_.range(5)           // [0, 1, 2, 3, 4]
_.range(1, 5)        // [1, 2, 3, 4]
_.range(0, 10, 2)    // [0, 2, 4, 6, 8]`,
          playground: {
            data: null,
            expression: '_.range(1, 11)'
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
  }

  getCategoryId(categoryName: string): string {
    return categoryName.toLowerCase().replace(/\s+/g, '-');
  }

  getCombiningExample(): string {
    return `// Use lodash for complex operations, then switch to $
const grouped = _.groupBy($.users, 'department')
const results = Object.entries(grouped).map(([dept, users]) => ({
  department: dept,
  averageAge: _.mean(users.map(u => u.age))
}))`;
  }

  getGroupByExpression(): string {
    return 'const grouped = _.groupBy($, "dept"); _.map(_.entries(grouped), ([dept, employees]) => ({ department: dept, count: employees.length, avgSalary: _.mean(_.pluck(employees, "salary")) }))';
  }
}