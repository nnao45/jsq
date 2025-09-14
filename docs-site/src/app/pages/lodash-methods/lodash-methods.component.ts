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
    <div class="container-with-sidebar">
      <aside class="sidebar">
        <nav class="sidebar-nav">
          <h2>Methods</h2>
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
              Static vs Chained Usage
            </a>
          </div>
          <div class="category-group">
            <a 
              href="#combining" 
              (click)="scrollToSection($event, 'combining')"
              class="special-section"
              [class.active]="activeSection === 'combining'"
            >
              Combining with Smart Dollar
            </a>
          </div>
        </nav>
      </aside>
      
      <div class="main-content">
        <div class="prose">
          <h1>Lodash Methods</h1>
          <p>jsq includes the complete lodash utility library, accessible through the underscore (<code>_</code>) namespace. This provides 120+ additional methods for data manipulation.</p>
          
          <div class="usage-note" id="usage-note">
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
export class LodashMethodsComponent implements OnInit {
  expandedCategories: Set<string> = new Set();
  activeCategory: string = '';
  activeMethod: string = '';
  activeSection: string = '';
  
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
        },
        {
          name: '_.findLast(collection, predicate)',
          description: 'Finds element iterating from right to left.',
          syntax: '_.findLast(collection, predicate)',
          example: `_.findLast([1, 2, 3, 4], n => n % 2 === 1)
// Output: 3`,
          playground: {
            data: [{id: 1, status: "pending"}, {id: 2, status: "complete"}, {id: 3, status: "pending"}, {id: 4, status: "complete"}],
            expression: '_.findLast($, item => item.status === "complete")'
          }
        },
        {
          name: '_.findLastIndex(array, predicate)',
          description: 'Finds index iterating from right to left.',
          syntax: '_.findLastIndex(array, predicate)',
          example: `_.findLastIndex([1, 2, 3, 4], n => n % 2 === 1)
// Output: 2`,
          playground: {
            data: ["apple", "banana", "apple", "orange", "apple"],
            expression: '_.findLastIndex($, fruit => fruit === "apple")'
          }
        },
        {
          name: '_.nth(array, n)',
          description: 'Gets element at index n (supports negative indexes).',
          syntax: '_.nth(array, n)',
          example: `_.nth(['a', 'b', 'c', 'd'], 1)   // 'b'
_.nth(['a', 'b', 'c', 'd'], -2)  // 'c'`,
          playground: {
            data: ["first", "second", "third", "fourth", "fifth"],
            expression: '_.nth($, 2)'
          }
        },
        {
          name: '_.pullAt(array, ...indexes)',
          description: 'Removes elements at given indexes (mutates array).',
          syntax: '_.pullAt(array, ...indexes)',
          example: `const arr = ['a', 'b', 'c', 'd'];
const pulled = _.pullAt(arr, [1, 3]);
// arr: ['a', 'c'], pulled: ['b', 'd']`,
          playground: {
            data: ["zero", "one", "two", "three", "four"],
            expression: 'const arr = [...$]; _.pullAt(arr, [1, 3])'
          }
        },
        {
          name: '_.takeRight(array, n)',
          description: 'Takes n elements from end.',
          syntax: '_.takeRight(array, n)',
          example: `_.takeRight([1, 2, 3, 4, 5], 3)
// Output: [3, 4, 5]`,
          playground: {
            data: ["a", "b", "c", "d", "e", "f"],
            expression: '_.takeRight($, 3)'
          }
        },
        {
          name: '_.takeRightWhile(array, predicate)',
          description: 'Takes elements from end while predicate returns true.',
          syntax: '_.takeRightWhile(array, predicate)',
          example: `_.takeRightWhile([1, 2, 3, 4, 5], n => n > 3)
// Output: [4, 5]`,
          playground: {
            data: [{score: 65}, {score: 70}, {score: 85}, {score: 90}, {score: 95}],
            expression: '_.takeRightWhile($, item => item.score >= 85)'
          }
        },
        {
          name: '_.dropRight(array, n)',
          description: 'Drops n elements from end.',
          syntax: '_.dropRight(array, n)',
          example: `_.dropRight([1, 2, 3, 4, 5], 2)
// Output: [1, 2, 3]`,
          playground: {
            data: ["keep", "keep", "keep", "drop", "drop"],
            expression: '_.dropRight($, 2)'
          }
        },
        {
          name: '_.dropRightWhile(array, predicate)',
          description: 'Drops elements from end while predicate returns true.',
          syntax: '_.dropRightWhile(array, predicate)',
          example: `_.dropRightWhile([1, 2, 3, 4, 5], n => n > 3)
// Output: [1, 2, 3]`,
          playground: {
            data: [{active: true}, {active: true}, {active: false}, {active: false}],
            expression: '_.dropRightWhile($, item => !item.active)'
          }
        },
        {
          name: '_.zipObject(keys, values)',
          description: 'Creates object from arrays of keys and values.',
          syntax: '_.zipObject(keys, values)',
          example: `_.zipObject(['a', 'b'], [1, 2])
// Output: {a: 1, b: 2}`,
          playground: {
            data: [["name", "age", "city"], ["Alice", 25, "NYC"]],
            expression: '_.zipObject(...$)'
          }
        },
        {
          name: '_.zipObjectDeep(keys, values)',
          description: 'Creates object from arrays of keys and values with deep path support.',
          syntax: '_.zipObjectDeep(keys, values)',
          example: `_.zipObjectDeep(['a.b[0].c', 'a.b[1].d'], [1, 2])
// Output: {a: {b: [{c: 1}, {d: 2}]}}`,
          playground: {
            data: [["user.name", "user.email", "settings.theme"], ["Alice", "alice@example.com", "dark"]],
            expression: '_.zipObjectDeep(...$)'
          }
        },
        {
          name: '_.unzip(array)',
          description: 'Groups elements by index from multiple arrays.',
          syntax: '_.unzip(array)',
          example: `_.unzip([['a', 1], ['b', 2], ['c', 3]])
// Output: [['a', 'b', 'c'], [1, 2, 3]]`,
          playground: {
            data: [["Alice", 25, "Engineer"], ["Bob", 30, "Designer"], ["Charlie", 28, "Manager"]],
            expression: '_.unzip($)'
          }
        },
        {
          name: '_.unzipWith(array, iteratee)',
          description: 'Groups elements by index using iteratee.',
          syntax: '_.unzipWith(array, iteratee)',
          example: `_.unzipWith([[1, 10], [2, 20]], (a, b) => a + b)
// Output: [3, 30]`,
          playground: {
            data: [[1, 4], [2, 5], [3, 6]],
            expression: '_.unzipWith($, (...args) => args.reduce((sum, n) => sum + n, 0))'
          }
        },
        {
          name: '_.find(collection, predicate)',
          description: 'Finds the first element matching the predicate.',
          syntax: '_.find(collection, predicate)',
          example: `_.find([1, 2, 3, 4], n => n > 2)
// Output: 3`,
          playground: {
            data: [{id: 1, name: "Alice"}, {id: 2, name: "Bob"}, {id: 3, name: "Charlie"}],
            expression: '_.find($, user => user.name.startsWith("B"))'
          }
        },
        {
          name: '_.findIndex(array, predicate)',
          description: 'Returns index of first element matching predicate.',
          syntax: '_.findIndex(array, predicate)',
          example: `_.findIndex([1, 2, 3, 4], n => n > 2)
// Output: 2`,
          playground: {
            data: ["apple", "banana", "cherry", "date"],
            expression: '_.findIndex($, fruit => fruit.length > 5)'
          }
        },
        {
          name: '_.where(collection, source)',
          description: 'Filters by exact property matches.',
          syntax: '_.where(collection, source)',
          example: `_.where(users, {active: true, age: 25})
// Returns all users with active=true AND age=25`,
          playground: {
            data: [{name: "Alice", role: "admin", active: true}, {name: "Bob", role: "user", active: true}, {name: "Charlie", role: "admin", active: false}],
            expression: '_.where($, {role: "admin", active: true})'
          }
        },
        {
          name: '_.drop(array, n) / _.skip(array, n)',
          description: 'Drops first n elements from array.',
          syntax: '_.drop(array, n)',
          example: `_.drop([1, 2, 3, 4, 5], 2)
// Output: [3, 4, 5]`,
          playground: {
            data: ["skip", "skip", "keep", "keep", "keep"],
            expression: '_.drop($, 2)'
          }
        },
        {
          name: '_.dropWhile(array, predicate)',
          description: 'Drops elements while predicate returns true.',
          syntax: '_.dropWhile(array, predicate)',
          example: `_.dropWhile([1, 2, 3, 4, 5], n => n < 3)
// Output: [3, 4, 5]`,
          playground: {
            data: [{score: 50}, {score: 60}, {score: 80}, {score: 90}],
            expression: '_.dropWhile($, item => item.score < 70)'
          }
        },
        {
          name: '_.uniq(array)',
          description: 'Removes duplicate values from array.',
          syntax: '_.uniq(array)',
          example: `_.uniq([1, 2, 1, 3, 2, 4])
// Output: [1, 2, 3, 4]`,
          playground: {
            data: ["apple", "banana", "apple", "cherry", "banana", "date"],
            expression: '_.uniq($)'
          }
        },
        {
          name: '_.sample(collection)',
          description: 'Gets a random element from collection.',
          syntax: '_.sample(collection)',
          example: `_.sample([1, 2, 3, 4, 5])
// Output: (random element)`,
          playground: {
            data: ["🍎", "🍊", "🍋", "🍌", "🍉", "🍇"],
            expression: '_.sample($)'
          }
        },
        {
          name: '_.sampleSize(collection, n)',
          description: 'Gets n random elements from collection.',
          syntax: '_.sampleSize(collection, n)',
          example: `_.sampleSize([1, 2, 3, 4, 5], 3)
// Output: (3 random elements)`,
          playground: {
            data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            expression: '_.sampleSize($, 3)'
          }
        },
        {
          name: '_.flatten(array)',
          description: 'Flattens array one level deep.',
          syntax: '_.flatten(array)',
          example: `_.flatten([[1, 2], [3, [4]], 5])
// Output: [1, 2, 3, [4], 5]`,
          playground: {
            data: [[1, 2], [3, 4], [[5, 6]]],
            expression: '_.flatten($)'
          }
        },
        {
          name: '_.flattenDeep(array)',
          description: 'Recursively flattens array.',
          syntax: '_.flattenDeep(array)',
          example: `_.flattenDeep([1, [2, [3, [4]], 5]])
// Output: [1, 2, 3, 4, 5]`,
          playground: {
            data: [1, [2, [3, [4]], 5], [[6]]],
            expression: '_.flattenDeep($)'
          }
        },
        {
          name: '_.chunk(array, size)',
          description: 'Splits array into groups of size.',
          syntax: '_.chunk(array, size)',
          example: `_.chunk([1, 2, 3, 4, 5, 6, 7], 3)
// Output: [[1, 2, 3], [4, 5, 6], [7]]`,
          playground: {
            data: ["a", "b", "c", "d", "e", "f", "g", "h"],
            expression: '_.chunk($, 3)'
          }
        },
        {
          name: '_.reverse(array)',
          description: 'Reverses array (mutates original).',
          syntax: '_.reverse(array)',
          example: `_.reverse([1, 2, 3, 4])
// Output: [4, 3, 2, 1]`,
          playground: {
            data: ["first", "second", "third", "fourth"],
            expression: '_.reverse([...$])'
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
        },
        {
          name: '_.flatMap(collection, iteratee)',
          description: 'Maps collection and flattens the result by one level.',
          syntax: '_.flatMap(collection, iteratee)',
          example: `_.flatMap([1, 2, 3], n => [n, n * 2])
// Output: [1, 2, 2, 4, 3, 6]`,
          playground: {
            data: [{name: "Alice", hobbies: ["reading", "swimming"]}, {name: "Bob", hobbies: ["gaming", "cooking"]}],
            expression: '_.flatMap($, user => user.hobbies)'
          }
        },
        {
          name: '_.flatMapDeep(collection, iteratee)',
          description: 'Maps collection and flattens the result recursively.',
          syntax: '_.flatMapDeep(collection, iteratee)',
          example: `_.flatMapDeep([1, 2], n => [[n, [n * 2]]])
// Output: [1, 2, 2, 4]`,
          playground: {
            data: [{id: 1, nested: [[1, 2], [3, 4]]}, {id: 2, nested: [[5, 6]]}],
            expression: '_.flatMapDeep($, item => item.nested)'
          }
        },
        {
          name: '_.invokeMap(collection, method, ...args)',
          description: 'Invokes method on each element in collection.',
          syntax: '_.invokeMap(collection, method, ...args)',
          example: `_.invokeMap(['hello', 'world'], 'toUpperCase')
// Output: ['HELLO', 'WORLD']`,
          playground: {
            data: [[1, 2, 3], [4, 5], [6, 7, 8, 9]],
            expression: '_.invokeMap($, "slice", 0, 2)'
          }
        },
        {
          name: '_.partition(collection, predicate)',
          description: 'Splits collection into two arrays based on predicate.',
          syntax: '_.partition(collection, predicate)',
          example: `_.partition([1, 2, 3, 4, 5], n => n % 2 === 0)
// Output: [[2, 4], [1, 3, 5]]`,
          playground: {
            data: [{name: "Alice", active: true}, {name: "Bob", active: false}, {name: "Charlie", active: true}, {name: "David", active: false}],
            expression: '_.partition($, user => user.active)'
          }
        },
        {
          name: '_.pullAll(array, values)',
          description: 'Removes all given values from array (mutates array).',
          syntax: '_.pullAll(array, values)',
          example: `const arr = [1, 2, 3, 1, 2, 3];
_.pullAll(arr, [2, 3]);
// arr is now [1, 1]`,
          playground: {
            data: ["apple", "banana", "orange", "apple", "grape", "banana"],
            expression: '(() => { const arr = [...$]; _.pullAll(arr, ["apple", "banana"]); return arr; })()'
          }
        },
        {
          name: '_.pullAllBy(array, values, iteratee)',
          description: 'Removes values from array using iteratee for comparison.',
          syntax: '_.pullAllBy(array, values, iteratee)',
          example: `const arr = [{x: 1}, {x: 2}, {x: 3}];
_.pullAllBy(arr, [{x: 1}, {x: 3}], 'x');
// arr is now [{x: 2}]`,
          playground: {
            data: [{id: 1, name: "Alice"}, {id: 2, name: "Bob"}, {id: 3, name: "Charlie"}],
            expression: '(() => { const arr = [...$]; _.pullAllBy(arr, [{id: 2}, {id: 3}], "id"); return arr; })()'
          }
        },
        {
          name: '_.differenceBy(array, ...values, iteratee)',
          description: 'Creates array excluding values using iteratee for comparison.',
          syntax: '_.differenceBy(array, ...values, iteratee)',
          example: `_.differenceBy([{x: 2}, {x: 1}], [{x: 1}], 'x')
// Output: [{x: 2}]`,
          playground: {
            data: [{id: 1, name: "Alice"}, {id: 2, name: "Bob"}, {id: 3, name: "Charlie"}],
            expression: '_.differenceBy($, [{id: 2}, {id: 4}], "id")'
          }
        },
        {
          name: '_.differenceWith(array, ...values, comparator)',
          description: 'Creates array excluding values using comparator.',
          syntax: '_.differenceWith(array, ...values, comparator)',
          example: `_.differenceWith([{x: 1, y: 2}], [{x: 1, y: 3}], (a, b) => a.x === b.x)
// Output: []`,
          playground: {
            data: [{x: 1, y: 2}, {x: 2, y: 1}, {x: 3, y: 4}],
            expression: '_.differenceWith($, [{x: 1, y: 3}], (a, b) => a.x === b.x)'
          }
        },
        {
          name: '_.intersectionBy(...arrays, iteratee)',
          description: 'Creates array of unique values using iteratee.',
          syntax: '_.intersectionBy(...arrays, iteratee)',
          example: `_.intersectionBy([{x: 1}], [{x: 2}, {x: 1}], 'x')
// Output: [{x: 1}]`,
          playground: {
            data: [[{id: 1}, {id: 2}, {id: 3}], [{id: 2}, {id: 3}, {id: 4}]],
            expression: '_.intersectionBy(...$, "id")'
          }
        },
        {
          name: '_.intersectionWith(...arrays, comparator)',
          description: 'Creates array of unique values using comparator.',
          syntax: '_.intersectionWith(...arrays, comparator)',
          example: `_.intersectionWith([{x: 1, y: 2}], [{x: 1, y: 3}], (a, b) => a.x === b.x)
// Output: [{x: 1, y: 2}]`,
          playground: {
            data: [[{x: 1, y: 2}, {x: 2, y: 1}], [{x: 1, y: 3}, {x: 3, y: 2}]],
            expression: '_.intersectionWith(...$, (a, b) => a.x === b.x)'
          }
        },
        {
          name: '_.unionBy(...arrays, iteratee)',
          description: 'Creates array of unique values from all arrays using iteratee.',
          syntax: '_.unionBy(...arrays, iteratee)',
          example: `_.unionBy([{x: 1}], [{x: 2}, {x: 1}], 'x')
// Output: [{x: 1}, {x: 2}]`,
          playground: {
            data: [[{id: 1, name: "Alice"}, {id: 2, name: "Bob"}], [{id: 2, name: "Bob"}, {id: 3, name: "Charlie"}]],
            expression: '_.unionBy(...$, "id")'
          }
        },
        {
          name: '_.unionWith(...arrays, comparator)',
          description: 'Creates array of unique values from all arrays using comparator.',
          syntax: '_.unionWith(...arrays, comparator)',
          example: `_.unionWith([{x: 1, y: 2}], [{x: 1, y: 3}], (a, b) => a.x === b.x)
// Output: [{x: 1, y: 2}]`,
          playground: {
            data: [[{x: 1, y: 2}, {x: 2, y: 1}], [{x: 1, y: 3}, {x: 3, y: 2}]],
            expression: '_.unionWith(...$, (a, b) => a.x === b.x)'
          }
        },
        {
          name: '_.xor(...arrays)',
          description: 'Creates array of symmetric difference (values in exactly one array).',
          syntax: '_.xor(...arrays)',
          example: `_.xor([2, 1], [2, 3])
// Output: [1, 3]`,
          playground: {
            data: [[1, 2, 3], [2, 3, 4], [3, 4, 5]],
            expression: '_.xor(...$)'
          }
        },
        {
          name: '_.xorBy(...arrays, iteratee)',
          description: 'Creates array of symmetric difference using iteratee.',
          syntax: '_.xorBy(...arrays, iteratee)',
          example: `_.xorBy([{x: 1}], [{x: 2}, {x: 1}], 'x')
// Output: [{x: 2}]`,
          playground: {
            data: [[{id: 1}, {id: 2}], [{id: 2}, {id: 3}]],
            expression: '_.xorBy(...$, "id")'
          }
        },
        {
          name: '_.xorWith(...arrays, comparator)',
          description: 'Creates array of symmetric difference using comparator.',
          syntax: '_.xorWith(...arrays, comparator)',
          example: `_.xorWith([{x: 1, y: 2}], [{x: 1, y: 3}], (a, b) => a.x === b.x)
// Output: []`,
          playground: {
            data: [[{x: 1, y: 2}, {x: 2, y: 1}], [{x: 1, y: 3}, {x: 3, y: 2}]],
            expression: '_.xorWith(...$, (a, b) => a.x === b.x)'
          }
        },
        {
          name: '_.countBy(collection, iteratee)',
          description: 'Creates object of counts by iteratee result.',
          syntax: '_.countBy(collection, iteratee)',
          example: `_.countBy([4.3, 6.1, 6.4], Math.floor)
// Output: {4: 1, 6: 2}`,
          playground: {
            data: ["apple", "banana", "apricot", "blueberry", "avocado"],
            expression: '_.countBy($, fruit => fruit[0])'
          }
        },
        {
          name: '_.keyBy(collection, iteratee)',
          description: 'Creates object keyed by iteratee result.',
          syntax: '_.keyBy(collection, iteratee)',
          example: `_.keyBy([{id: 'a1', name: 'Alice'}], 'id')
// Output: {'a1': {id: 'a1', name: 'Alice'}}`,
          playground: {
            data: [{id: 1, name: "Alice"}, {id: 2, name: "Bob"}, {id: 3, name: "Charlie"}],
            expression: '_.keyBy($, "id")'
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
        },
        {
          name: '_.meanBy(array, iteratee)',
          description: 'Computes mean of values using iteratee.',
          syntax: '_.meanBy(array, iteratee)',
          example: `_.meanBy([{n: 4}, {n: 2}, {n: 8}, {n: 6}], 'n')
// Output: 5`,
          playground: {
            data: [{product: "A", rating: 4.5}, {product: "B", rating: 3.8}, {product: "C", rating: 4.2}],
            expression: '_.meanBy($, "rating")'
          }
        },
        {
          name: '_.sumBy(array, iteratee)',
          description: 'Computes sum of values using iteratee.',
          syntax: '_.sumBy(array, iteratee)',
          example: `_.sumBy([{n: 4}, {n: 2}, {n: 8}], 'n')
// Output: 14`,
          playground: {
            data: [{item: "apple", quantity: 3, price: 2}, {item: "banana", quantity: 5, price: 1}],
            expression: '_.sumBy($, item => item.quantity * item.price)'
          }
        },
        {
          name: '_.add(augend, addend)',
          description: 'Adds two numbers.',
          syntax: '_.add(augend, addend)',
          example: `_.add(6, 4)  // 10
_.add(0.1, 0.2)  // 0.30000000000000004`,
          playground: {
            data: [10, 20],
            expression: '_.add(...$)'
          }
        },
        {
          name: '_.subtract(minuend, subtrahend)',
          description: 'Subtracts two numbers.',
          syntax: '_.subtract(minuend, subtrahend)',
          example: `_.subtract(6, 4)  // 2`,
          playground: {
            data: [100, 25],
            expression: '_.subtract(...$)'
          }
        },
        {
          name: '_.multiply(multiplier, multiplicand)',
          description: 'Multiplies two numbers.',
          syntax: '_.multiply(multiplier, multiplicand)',
          example: `_.multiply(6, 4)  // 24`,
          playground: {
            data: [7, 8],
            expression: '_.multiply(...$)'
          }
        },
        {
          name: '_.divide(dividend, divisor)',
          description: 'Divides two numbers.',
          syntax: '_.divide(dividend, divisor)',
          example: `_.divide(6, 4)  // 1.5`,
          playground: {
            data: [100, 25],
            expression: '_.divide(...$)'
          }
        },
        {
          name: '_.ceil(number, precision)',
          description: 'Rounds up to precision.',
          syntax: '_.ceil(number, precision)',
          example: `_.ceil(4.006)     // 5
_.ceil(6.004, 2)  // 6.01
_.ceil(6040, -2)  // 6100`,
          playground: {
            data: 4.12345,
            expression: '({ default: _.ceil($), precision2: _.ceil($, 2), precisionNeg1: _.ceil($, -1) })'
          }
        },
        {
          name: '_.floor(number, precision)',
          description: 'Rounds down to precision.',
          syntax: '_.floor(number, precision)',
          example: `_.floor(4.006)     // 4
_.floor(0.046, 2)  // 0.04
_.floor(4060, -2)  // 4000`,
          playground: {
            data: 4.98765,
            expression: '({ default: _.floor($), precision2: _.floor($, 2), precisionNeg1: _.floor($, -1) })'
          }
        },
        {
          name: '_.round(number, precision)',
          description: 'Rounds to precision.',
          syntax: '_.round(number, precision)',
          example: `_.round(4.006)     // 4
_.round(4.006, 2)  // 4.01
_.round(4060, -2)  // 4100`,
          playground: {
            data: 4.56789,
            expression: '({ default: _.round($), precision2: _.round($, 2), precisionNeg1: _.round($, -1) })'
          }
        },
        {
          name: '_.min(array)',
          description: 'Gets minimum value from array.',
          syntax: '_.min(array)',
          example: `_.min([4, 2, 8, 6])  // 2
_.min([])            // undefined`,
          playground: {
            data: [10, 5, 40, 3, 25],
            expression: '_.min($)'
          }
        },
        {
          name: '_.max(array)',
          description: 'Gets maximum value from array.',
          syntax: '_.max(array)',
          example: `_.max([4, 2, 8, 6])  // 8
_.max([])            // undefined`,
          playground: {
            data: [10, 5, 40, 3, 25],
            expression: '_.max($)'
          }
        },
        {
          name: '_.minBy(array, iteratee)',
          description: 'Gets element with minimum iteratee value.',
          syntax: '_.minBy(array, iteratee)',
          example: `_.minBy([{n: 3}, {n: 1}, {n: 4}], 'n')
// Output: {n: 1}`,
          playground: {
            data: [{name: "Alice", score: 85}, {name: "Bob", score: 92}, {name: "Charlie", score: 78}],
            expression: '_.minBy($, "score")'
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
        },
        {
          name: '_.get(object, path, defaultValue)',
          description: 'Gets value at path of object.',
          syntax: '_.get(object, path, defaultValue)',
          example: `_.get({a: {b: {c: 3}}}, 'a.b.c')     // 3
_.get({a: {b: {c: 3}}}, 'a.b.d', 0)  // 0`,
          playground: {
            data: {user: {profile: {name: "Alice", address: {city: "NYC"}}}},
            expression: '({ name: _.get($, "user.profile.name"), zip: _.get($, "user.profile.address.zip", "00000") })'
          }
        },
        {
          name: '_.set(object, path, value)',
          description: 'Sets value at path of object.',
          syntax: '_.set(object, path, value)',
          example: `const obj = {a: {b: {c: 3}}};
_.set(obj, 'a.b.d', 4);
// obj is now {a: {b: {c: 3, d: 4}}}`,
          playground: {
            data: {user: {name: "Alice"}},
            expression: '_.set($, "user.profile.age", 25); $'
          }
        },
        {
          name: '_.has(object, path)',
          description: 'Checks if path exists in object.',
          syntax: '_.has(object, path)',
          example: `_.has({a: {b: 2}}, 'a')     // true
_.has({a: {b: 2}}, 'a.b')   // true
_.has({a: {b: 2}}, 'a.c')   // false`,
          playground: {
            data: {user: {profile: {name: "Alice", email: "alice@example.com"}}},
            expression: '({ hasName: _.has($, "user.profile.name"), hasPhone: _.has($, "user.profile.phone") })'
          }
        },
        {
          name: '_.hasIn(object, path)',
          description: 'Checks if path exists (including inherited properties).',
          syntax: '_.hasIn(object, path)',
          example: `const obj = Object.create({a: 1});
_.has(obj, 'a')   // false
_.hasIn(obj, 'a') // true`,
          playground: {
            data: {name: "Alice", toString: Function.prototype.toString},
            expression: '({ has: _.has($, "toString"), hasIn: _.hasIn($, "toString") })'
          }
        },
        {
          name: '_.mapKeys(object, iteratee)',
          description: 'Creates object with same values but mapped keys.',
          syntax: '_.mapKeys(object, iteratee)',
          example: `_.mapKeys({a: 1, b: 2}, (value, key) => key + value)
// Output: {a1: 1, b2: 2}`,
          playground: {
            data: {firstName: "Alice", lastName: "Smith"},
            expression: '_.mapKeys($, (value, key) => _.snakeCase(key))'
          }
        },
        {
          name: '_.mapValues(object, iteratee)',
          description: 'Creates object with same keys but mapped values.',
          syntax: '_.mapValues(object, iteratee)',
          example: `_.mapValues({a: 1, b: 2}, n => n * 2)
// Output: {a: 2, b: 4}`,
          playground: {
            data: {alice: {age: 25}, bob: {age: 30}},
            expression: '_.mapValues($, user => user.age)'
          }
        },
        {
          name: '_.toPairs(object)',
          description: 'Converts object to array of key-value pairs.',
          syntax: '_.toPairs(object)',
          example: `_.toPairs({a: 1, b: 2})
// Output: [['a', 1], ['b', 2]]`,
          playground: {
            data: {name: "Alice", age: 25, city: "NYC"},
            expression: '_.toPairs($)'
          }
        },
        {
          name: '_.toPairsIn(object)',
          description: 'Converts object to array of key-value pairs (including inherited).',
          syntax: '_.toPairsIn(object)',
          example: `function Foo() { this.a = 1; }
Foo.prototype.b = 2;
_.toPairsIn(new Foo)
// Output: [['a', 1], ['b', 2]]`,
          playground: {
            data: {own: "property", inherited: Object.prototype.toString},
            expression: '_.toPairsIn($).map(([k, v]) => [k, typeof v])'
          }
        },
        {
          name: '_.assignIn(object, ...sources)',
          description: 'Assigns own and inherited properties.',
          syntax: '_.assignIn(object, ...sources)',
          example: `function Foo() { this.a = 1; }
Foo.prototype.b = 2;
_.assignIn({c: 3}, new Foo)
// Output: {a: 1, b: 2, c: 3}`,
          playground: {
            data: {a: 1},
            expression: '_.assignIn({}, $, {b: 2}, {c: 3})'
          }
        },
        {
          name: '_.assignWith(object, ...sources, customizer)',
          description: 'Assigns with customizer function.',
          syntax: '_.assignWith(object, ...sources, customizer)',
          example: `_.assignWith({a: 1}, {a: 2}, (obj, src) => obj + src)
// Output: {a: 3}`,
          playground: {
            data: {count: 10},
            expression: '_.assignWith({}, $, {count: 5}, (objValue, srcValue) => objValue === undefined ? srcValue : objValue + srcValue)'
          }
        },
        {
          name: '_.mergeWith(object, ...sources, customizer)',
          description: 'Deep merges with customizer function.',
          syntax: '_.mergeWith(object, ...sources, customizer)',
          example: `_.mergeWith({a: [1]}, {a: [2]}, (obj, src) => 
  _.isArray(obj) ? obj.concat(src) : undefined)
// Output: {a: [1, 2]}`,
          playground: {
            data: {tags: ["js"], meta: {views: 100}},
            expression: '_.mergeWith({}, $, {tags: ["node"], meta: {likes: 50}}, (objValue, srcValue) => _.isArray(objValue) ? objValue.concat(srcValue) : undefined)'
          }
        },
        {
          name: '_.at(object, ...paths)',
          description: 'Gets values at given paths of object.',
          syntax: '_.at(object, ...paths)',
          example: `_.at({a: {b: {c: 3}}, x: {y: 4}}, ['a.b.c', 'x.y'])
// Output: [3, 4]`,
          playground: {
            data: {user: {name: "Alice", email: "alice@example.com"}, settings: {theme: "dark"}},
            expression: '_.at($, ["user.name", "settings.theme", "settings.language"])'
          }
        },
        {
          name: '_.keys(object)',
          description: 'Gets object keys.',
          syntax: '_.keys(object)',
          example: `_.keys({a: 1, b: 2, c: 3})
// Output: ['a', 'b', 'c']`,
          playground: {
            data: {name: "Alice", age: 25, city: "NYC"},
            expression: '_.keys($)'
          }
        },
        {
          name: '_.values(object)',
          description: 'Gets object values.',
          syntax: '_.values(object)',
          example: `_.values({a: 1, b: 2, c: 3})
// Output: [1, 2, 3]`,
          playground: {
            data: {name: "Alice", age: 25, city: "NYC"},
            expression: '_.values($)'
          }
        },
        {
          name: '_.entries(object)',
          description: 'Gets key-value pairs (alias for toPairs).',
          syntax: '_.entries(object)',
          example: `_.entries({a: 1, b: 2})
// Output: [['a', 1], ['b', 2]]`,
          playground: {
            data: {x: 10, y: 20, z: 30},
            expression: '_.entries($)'
          }
        },
        {
          name: '_.fromPairs(pairs)',
          description: 'Creates object from key-value pairs.',
          syntax: '_.fromPairs(pairs)',
          example: `_.fromPairs([['a', 1], ['b', 2]])
// Output: {a: 1, b: 2}`,
          playground: {
            data: [["name", "Alice"], ["age", 25], ["city", "NYC"]],
            expression: '_.fromPairs($)'
          }
        },
        {
          name: '_.invert(object)',
          description: 'Swaps keys and values.',
          syntax: '_.invert(object)',
          example: `_.invert({a: 1, b: 2, c: 1})
// Output: {1: 'c', 2: 'b'}`,
          playground: {
            data: {alice: "admin", bob: "user", charlie: "admin"},
            expression: '_.invert($)'
          }
        },
        {
          name: '_.merge(object, ...sources)',
          description: 'Deep merges objects.',
          syntax: '_.merge(object, ...sources)',
          example: `_.merge({a: {b: 1}}, {a: {c: 2}})
// Output: {a: {b: 1, c: 2}}`,
          playground: {
            data: {user: {name: "Alice", preferences: {theme: "dark"}}},
            expression: '_.merge({}, $, {user: {preferences: {notifications: true}}})'
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
        },
        {
          name: '_.upperCase(string)',
          description: 'Converts to upper case with spaces.',
          syntax: '_.upperCase(string)',
          example: `_.upperCase('fooBar')        // 'FOO BAR'
_.upperCase('__foo_bar__')   // 'FOO BAR'`,
          playground: {
            data: "hello-world_test",
            expression: '_.upperCase($)'
          }
        },
        {
          name: '_.lowerCase(string)',
          description: 'Converts to lower case with spaces.',
          syntax: '_.lowerCase(string)',
          example: `_.lowerCase('fooBar')        // 'foo bar'
_.lowerCase('__FOO_BAR__')   // 'foo bar'`,
          playground: {
            data: "HELLO-WORLD_TEST",
            expression: '_.lowerCase($)'
          }
        },
        {
          name: '_.pad(string, length, chars)',
          description: 'Pads string on both sides to given length.',
          syntax: '_.pad(string, length, chars)',
          example: `_.pad('abc', 8)          // '  abc   '
_.pad('abc', 8, '_-')    // '_-abc_-_'`,
          playground: {
            data: "hello",
            expression: '({ default: _.pad($, 10), custom: _.pad($, 12, "*") })'
          }
        },
        {
          name: '_.padStart(string, length, chars)',
          description: 'Pads string on left side to given length.',
          syntax: '_.padStart(string, length, chars)',
          example: `_.padStart('abc', 6)        // '   abc'
_.padStart('abc', 6, '_-')  // '_-_abc'`,
          playground: {
            data: "123",
            expression: '_.padStart($, 8, "0")'
          }
        },
        {
          name: '_.padEnd(string, length, chars)',
          description: 'Pads string on right side to given length.',
          syntax: '_.padEnd(string, length, chars)',
          example: `_.padEnd('abc', 6)        // 'abc   '
_.padEnd('abc', 6, '_-')  // 'abc_-_'`,
          playground: {
            data: "loading",
            expression: '_.padEnd($, 10, ".")'
          }
        },
        {
          name: '_.trim(string, chars)',
          description: 'Removes whitespace or specified characters from both ends.',
          syntax: '_.trim(string, chars)',
          example: `_.trim('  abc  ')       // 'abc'
_.trim('-_-abc-_-', '_-')  // 'abc'`,
          playground: {
            data: "  hello world  ",
            expression: '({ whitespace: _.trim($), custom: _.trim("__hello__", "_") })'
          }
        },
        {
          name: '_.trimStart(string, chars)',
          description: 'Removes whitespace or specified characters from beginning.',
          syntax: '_.trimStart(string, chars)',
          example: `_.trimStart('  abc  ')       // 'abc  '
_.trimStart('-_-abc', '_-')  // 'abc'`,
          playground: {
            data: "   hello",
            expression: '_.trimStart($)'
          }
        },
        {
          name: '_.trimEnd(string, chars)',
          description: 'Removes whitespace or specified characters from end.',
          syntax: '_.trimEnd(string, chars)',
          example: `_.trimEnd('  abc  ')       // '  abc'
_.trimEnd('abc-_-', '_-')  // 'abc'`,
          playground: {
            data: "hello   ",
            expression: '_.trimEnd($)'
          }
        },
        {
          name: '_.truncate(string, options)',
          description: 'Truncates string to given length.',
          syntax: '_.truncate(string, options)',
          example: `_.truncate('hi-diddly-ho there, neighborino')
// 'hi-diddly-ho there, neighbo...'
_.truncate('hi', {length: 30, omission: ' [...]'})
// 'hi [...]'`,
          playground: {
            data: "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
            expression: '_.truncate($, { length: 30, separator: " " })'
          }
        },
        {
          name: '_.escape(string)',
          description: 'Escapes HTML entities.',
          syntax: '_.escape(string)',
          example: `_.escape('fred, barney, & pebbles')
// 'fred, barney, &amp; pebbles'`,
          playground: {
            data: "<p>Hello & welcome to the 'world'</p>",
            expression: '_.escape($)'
          }
        },
        {
          name: '_.unescape(string)',
          description: 'Unescapes HTML entities.',
          syntax: '_.unescape(string)',
          example: `_.unescape('fred, barney, &amp; pebbles')
// 'fred, barney, & pebbles'`,
          playground: {
            data: "fred, barney, &amp; pebbles &lt;tag&gt;",
            expression: '_.unescape($)'
          }
        },
        {
          name: '_.words(string, pattern)',
          description: 'Splits string into array of words.',
          syntax: '_.words(string, pattern)',
          example: `_.words('fred, barney, & pebbles')
// ['fred', 'barney', 'pebbles']
_.words('fred-barney')
// ['fred', 'barney']`,
          playground: {
            data: "hello-world, foo_bar & test123",
            expression: '_.words($)'
          }
        },
        {
          name: '_.deburr(string)',
          description: 'Removes diacritical marks from string.',
          syntax: '_.deburr(string)',
          example: `_.deburr('déjà vu')  // 'deja vu'
_.deburr('João')     // 'Joao'`,
          playground: {
            data: "Héllö Wörld, çà và?",
            expression: '_.deburr($)'
          }
        },
        {
          name: '_.upperFirst(string)',
          description: 'Capitalizes first character.',
          syntax: '_.upperFirst(string)',
          example: `_.upperFirst('fred')   // 'Fred'
_.upperFirst('FRED')   // 'FRED'`,
          playground: {
            data: "hello world",
            expression: '_.upperFirst($)'
          }
        },
        {
          name: '_.lowerFirst(string)',
          description: 'Lowercases first character.',
          syntax: '_.lowerFirst(string)',
          example: `_.lowerFirst('Fred')   // 'fred'
_.lowerFirst('FRED')   // 'fRED'`,
          playground: {
            data: "Hello World",
            expression: '_.lowerFirst($)'
          }
        },
        {
          name: '_.capitalize(string)',
          description: 'Capitalizes first character and lowercases rest.',
          syntax: '_.capitalize(string)',
          example: `_.capitalize('FRED')   // 'Fred'
_.capitalize('fReD')   // 'Fred'`,
          playground: {
            data: "hELLO wORLD",
            expression: '_.capitalize($)'
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
        },
        {
          name: '_.size(collection)',
          description: 'Gets size of collection.',
          syntax: '_.size(collection)',
          example: `_.size([1, 2, 3])        // 3
_.size({a: 1, b: 2})     // 2
_.size('hello')          // 5`,
          playground: {
            data: {a: 1, b: 2, c: 3, d: 4},
            expression: '_.size($)'
          }
        },
        {
          name: '_.isEmpty(value)',
          description: 'Checks if value is empty.',
          syntax: '_.isEmpty(value)',
          example: `_.isEmpty([])        // true
_.isEmpty({})        // true
_.isEmpty('')        // true
_.isEmpty([1, 2])    // false`,
          playground: {
            data: [],
            expression: '({ empty: _.isEmpty($), notEmpty: _.isEmpty([1, 2, 3]) })'
          }
        },
        {
          name: '_.identity(value)',
          description: 'Returns the value unchanged.',
          syntax: '_.identity(value)',
          example: `_.identity(42)       // 42
_.identity({a: 1})   // {a: 1}`,
          playground: {
            data: "Hello World",
            expression: '_.identity($)'
          }
        },
        {
          name: '_.constant(value)',
          description: 'Returns a function that always returns the value.',
          syntax: '_.constant(value)',
          example: `const always42 = _.constant(42);
always42()  // 42
always42()  // 42`,
          playground: {
            data: "fixed value",
            expression: 'const fn = _.constant($); ({ first: fn(), second: fn(), third: fn() })'
          }
        },
        {
          name: '_.times(n, iteratee)',
          description: 'Invokes iteratee n times.',
          syntax: '_.times(n, iteratee)',
          example: `_.times(3, () => Math.random())
// [0.123..., 0.456..., 0.789...]
_.times(5, i => i)  // [0, 1, 2, 3, 4]`,
          playground: {
            data: 5,
            expression: '_.times($, i => i * i)'
          }
        },
        {
          name: '_.clamp(number, lower, upper)',
          description: 'Clamps number within bounds.',
          syntax: '_.clamp(number, lower, upper)',
          example: `_.clamp(-10, -5, 5)  // -5
_.clamp(10, -5, 5)   // 5
_.clamp(3, -5, 5)    // 3`,
          playground: {
            data: [15, 0, 10],
            expression: '_.clamp(...$)'
          }
        },
        {
          name: '_.random(lower, upper, floating)',
          description: 'Generates random number.',
          syntax: '_.random(lower, upper, floating)',
          example: `_.random(0, 5)        // integer between 0-5
_.random(5)           // integer between 0-5
_.random(1.2, 5.2)    // float between 1.2-5.2`,
          playground: {
            data: null,
            expression: '({ int: _.random(1, 10), float: _.random(1.0, 10.0, true) })'
          }
        },
        {
          name: '_.chain(value)',
          description: 'Creates lodash wrapper for chaining.',
          syntax: '_.chain(value)',
          example: `_.chain([1, 2, 3])
  .map(n => n * 2)
  .filter(n => n > 2)
  .value()  // [4, 6]`,
          playground: {
            data: [1, 2, 3, 4, 5],
            expression: '_.chain($).map(n => n * n).filter(n => n > 10).value()'
          }
        },
        {
          name: '_.value() / _.valueOf()',
          description: 'Extracts wrapped value.',
          syntax: '_.value() / _.valueOf()',
          example: `_([1, 2, 3]).map(n => n * 2).value()
// [2, 4, 6]`,
          playground: {
            data: [1, 2, 3],
            expression: '_($).map(n => n * 2).value()'
          }
        }
      ]
    },
    {
      name: 'Function Methods',
      description: 'Function composition and control flow',
      methods: [
        {
          name: '_.debounce(func, wait, options)',
          description: 'Creates a debounced function that delays invoking func.',
          syntax: '_.debounce(func, wait, options)',
          example: `const debounced = _.debounce(updateQuery, 300);
// Function will only execute 300ms after last call`,
          playground: {
            data: null,
            expression: '// Debounce example - try typing quickly!\nconst log = _.debounce(() => "Debounced!", 1000); log()'
          }
        },
        {
          name: '_.throttle(func, wait, options)',
          description: 'Creates a throttled function that only invokes func at most once per wait.',
          syntax: '_.throttle(func, wait, options)',
          example: `const throttled = _.throttle(updatePosition, 100);
// Function executes at most once every 100ms`,
          playground: {
            data: null,
            expression: '// Throttle example - limits execution frequency\nconst log = _.throttle(() => "Throttled!", 1000); log()'
          }
        },
        {
          name: '_.curry(func, arity)',
          description: 'Creates a curried function.',
          syntax: '_.curry(func, arity)',
          example: `const abc = (a, b, c) => [a, b, c];
const curried = _.curry(abc);
curried(1)(2)(3)     // [1, 2, 3]
curried(1, 2)(3)     // [1, 2, 3]`,
          playground: {
            data: null,
            expression: 'const add = _.curry((a, b, c) => a + b + c); ({ partial: add(1)(2), full: add(1)(2)(3) })'
          }
        },
        {
          name: '_.curryRight(func, arity)',
          description: 'Creates a right-curried function.',
          syntax: '_.curryRight(func, arity)',
          example: `const abc = (a, b, c) => [a, b, c];
const curried = _.curryRight(abc);
curried(3)(2)(1)     // [1, 2, 3]`,
          playground: {
            data: null,
            expression: 'const divide = _.curryRight((a, b) => a / b); ({ partial: divide(2), full: divide(2)(10) })'
          }
        },
        {
          name: '_.partial(func, ...partials)',
          description: 'Creates a partially applied function.',
          syntax: '_.partial(func, ...partials)',
          example: `const greet = (greeting, name) => greeting + ' ' + name;
const sayHello = _.partial(greet, 'Hello');
sayHello('Alice')    // 'Hello Alice'`,
          playground: {
            data: null,
            expression: 'const multiply = (a, b, c) => a * b * c; const double = _.partial(multiply, 2, _, 1); double(5)'
          }
        },
        {
          name: '_.partialRight(func, ...partials)',
          description: 'Creates a partially applied function from right.',
          syntax: '_.partialRight(func, ...partials)',
          example: `const greet = (greeting, name) => greeting + ' ' + name;
const greetAlice = _.partialRight(greet, 'Alice');
greetAlice('Hello')  // 'Hello Alice'`,
          playground: {
            data: null,
            expression: 'const divide = (a, b) => a / b; const divideBy2 = _.partialRight(divide, 2); divideBy2(10)'
          }
        },
        {
          name: '_.memoize(func, resolver)',
          description: 'Creates a memoized function that caches results.',
          syntax: '_.memoize(func, resolver)',
          example: `const expensive = _.memoize(n => {
  console.log('Computing...');
  return n * n;
});
expensive(4)  // Computing... 16
expensive(4)  // 16 (cached)`,
          playground: {
            data: null,
            expression: 'const fib = _.memoize(n => n <= 1 ? n : fib(n - 1) + fib(n - 2)); [fib(10), fib(20), fib(30)]'
          }
        },
        {
          name: '_.once(func)',
          description: 'Creates a function that is restricted to invoking func once.',
          syntax: '_.once(func)',
          example: `const initialize = _.once(() => {
  console.log('Initialized!');
  return true;
});
initialize()  // 'Initialized!' true
initialize()  // true (no console log)`,
          playground: {
            data: null,
            expression: 'const init = _.once(() => ({ initialized: true, time: Date.now() })); [init(), init(), init()]'
          }
        },
        {
          name: '_.flow(...funcs)',
          description: 'Creates a function that is the composition of funcs.',
          syntax: '_.flow(...funcs)',
          example: `const add = n => n + 1;
const square = n => n * n;
const addSquare = _.flow(add, square);
addSquare(3)  // 16`,
          playground: {
            data: [1, 2, 3, 4, 5],
            expression: 'const process = _.flow(arr => _.filter(arr, n => n > 2), arr => _.map(arr, n => n * 2), _.sum); process($)'
          }
        },
        {
          name: '_.flowRight(...funcs)',
          description: 'Creates a function that is the composition of funcs (right to left).',
          syntax: '_.flowRight(...funcs)',
          example: `const add = n => n + 1;
const square = n => n * n;
const squareAdd = _.flowRight(add, square);
squareAdd(3)  // 10`,
          playground: {
            data: "hello world",
            expression: 'const process = _.flowRight(_.upperCase, s => s + "!", _.trim); process($)'
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