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
    <div class="container-with-sidebar">
      <button 
        class="sidebar-toggle" 
        (click)="toggleSidebar()"
        [attr.aria-label]="isSidebarOpen ? 'Close sidebar' : 'Open sidebar'"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      
      <div 
        class="sidebar-backdrop" 
        [class.visible]="isSidebarOpen"
        (click)="closeSidebar()"
      ></div>
      
      <aside class="sidebar" [class.sidebar-open]="isSidebarOpen">
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
                  {{ method.name }}
                </a>
              </li>
            </ul>
          </div>
          <div class="category-group">
            <a 
              href="#method-chaining" 
              (click)="scrollToSection($event, 'method-chaining')"
              class="special-section"
              [class.active]="activeSection === 'method-chaining'"
            >
              Method Chaining
            </a>
          </div>
        </nav>
      </aside>
      
      <div class="main-content">
        <div class="prose">
          <h1>Smart Dollar ($) Methods</h1>
          <p>The Smart Dollar (<code>$</code>) API provides a jQuery-like chainable interface for data manipulation with 115+ built-in methods.</p>

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
          
          <div class="method-chaining-section" id="method-chaining">
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
      transition: transform 0.3s ease;
      z-index: 100;
      
      @media (max-width: 1024px) {
        position: fixed;
        transform: translateX(-100%);
        box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
        
        &.sidebar-open {
          transform: translateX(0);
        }
      }
    }
    
    .sidebar-toggle {
      display: none;
      
      @media (max-width: 1024px) {
        display: flex;
        position: fixed;
        bottom: 2rem;
        right: 3rem;
        width: 56px;
        height: 56px;
        align-items: center;
        justify-content: center;
        background: var(--primary-color);
        border: none;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 999;
        transition: all 0.3s ease;
        
        svg {
          width: 24px;
          height: 24px;
          color: white;
        }
        
        &:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }
        
        &:active {
          transform: scale(0.95);
        }
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
    
    .method-chaining-section {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid var(--border-color);
      scroll-margin-top: 2rem;
    }
    
    .sidebar-backdrop {
      display: none;
      
      @media (max-width: 1024px) {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 99;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s ease;
        
        &.visible {
          display: block;
          opacity: 1;
          visibility: visible;
        }
      }
    }
  `]
})
export class SmartDollarMethodsComponent implements OnInit {
  methodChainingExpression = '$.filter(u => u.active).sortBy("score").reverse().pluck("name")';
  expandedCategories: Set<string> = new Set();
  activeCategory: string = '';
  activeMethod: string = '';
  activeSection: string = '';
  isSidebarOpen: boolean = false;
  
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
        },
        {
          name: 'concat(...values)',
          description: 'Concatenates arrays and values.',
          syntax: '$.array.concat(...values)',
          example: `$.arr1.concat(arr2, arr3)
// Input: [1, 2], [3, 4], [5]
// Output: [1, 2, 3, 4, 5]`,
          playground: {
            data: [1, 2, 3],
            expression: '$.concat([4, 5], 6, [7, 8])'
          }
        },
        {
          name: 'push(...elements) / pop()',
          description: 'Adds/removes elements from end.',
          syntax: '$.array.push(...elements) / $.array.pop()',
          example: `$.arr.push(4, 5)   // [1, 2, 3, 4, 5]
$.arr.pop()         // [1, 2, 3]`,
          playground: {
            data: [1, 2, 3],
            expression: '$.push(4, 5)'
          }
        },
        {
          name: 'shift() / unshift(...elements)',
          description: 'Removes/adds elements from beginning.',
          syntax: '$.array.shift() / $.array.unshift(...elements)',
          example: `$.arr.shift()       // [2, 3, 4]
$.arr.unshift(0)    // [0, 1, 2, 3]`,
          playground: {
            data: [1, 2, 3],
            expression: '$.unshift(0, -1)'
          }
        },
        {
          name: 'splice(start, deleteCount?, ...items)',
          description: 'Changes array by removing/replacing/adding elements.',
          syntax: '$.array.splice(start, deleteCount?, ...items)',
          example: `$.arr.splice(1, 2, "a", "b")
// Input: [1, 2, 3, 4]
// Output: [1, "a", "b", 4]`,
          playground: {
            data: ["a", "b", "c", "d", "e"],
            expression: '$.splice(2, 1, "X", "Y")'
          }
        },
        {
          name: 'slice(start?, end?)',
          description: 'Returns shallow copy of portion of array.',
          syntax: '$.array.slice(start?, end?)',
          example: `$.arr.slice(1, 3)
// Input: [1, 2, 3, 4, 5]
// Output: [2, 3]`,
          playground: {
            data: [1, 2, 3, 4, 5],
            expression: '$.slice(1, 4)'
          }
        },
        {
          name: 'some(predicate)',
          description: 'Tests if at least one element passes the test.',
          syntax: '$.array.some(predicate)',
          example: `$.numbers.some(n => n > 10)
// Input: [2, 5, 8, 12]
// Output: true`,
          playground: {
            data: [1, 3, 5, 7, 9],
            expression: '$.some(n => n % 2 === 0)'
          }
        },
        {
          name: 'every(predicate)',
          description: 'Tests if all elements pass the test.',
          syntax: '$.array.every(predicate)',
          example: `$.numbers.every(n => n > 0)
// Input: [1, 2, 3, 4]
// Output: true`,
          playground: {
            data: [2, 4, 6, 8],
            expression: '$.every(n => n % 2 === 0)'
          }
        },
        {
          name: 'includes(value)',
          description: 'Checks if array includes a value.',
          syntax: '$.array.includes(value)',
          example: `$.fruits.includes("apple")
// Input: ["banana", "apple", "orange"]
// Output: true`,
          playground: {
            data: ["red", "green", "blue"],
            expression: '$.includes("green")'
          }
        },
        {
          name: 'indexOf(value, fromIndex?)',
          description: 'Returns first index of value.',
          syntax: '$.array.indexOf(value, fromIndex?)',
          example: `$.arr.indexOf(3)
// Input: [1, 2, 3, 4, 3]
// Output: 2`,
          playground: {
            data: ["a", "b", "c", "b", "d"],
            expression: '$.indexOf("b")'
          }
        },
        {
          name: 'lastIndexOf(value, fromIndex?)',
          description: 'Returns last index of value.',
          syntax: '$.array.lastIndexOf(value, fromIndex?)',
          example: `$.arr.lastIndexOf(3)
// Input: [1, 2, 3, 4, 3]
// Output: 4`,
          playground: {
            data: ["a", "b", "c", "b", "d"],
            expression: '$.lastIndexOf("b")'
          }
        },
        {
          name: 'reverse()',
          description: 'Reverses array in place.',
          syntax: '$.array.reverse()',
          example: `$.arr.reverse()
// Input: [1, 2, 3, 4]
// Output: [4, 3, 2, 1]`,
          playground: {
            data: ["first", "second", "third"],
            expression: '$.reverse()'
          }
        },
        {
          name: 'sort(compareFn?)',
          description: 'Sorts array in place.',
          syntax: '$.array.sort(compareFn?)',
          example: `$.numbers.sort((a, b) => a - b)
// Sorts numbers ascending`,
          playground: {
            data: [3, 1, 4, 1, 5, 9, 2, 6],
            expression: '$.sort()'
          }
        },
        {
          name: 'join(separator?)',
          description: 'Joins array elements into string.',
          syntax: '$.array.join(separator?)',
          example: `$.words.join(" ")
// Input: ["Hello", "world"]
// Output: "Hello world"`,
          playground: {
            data: ["apple", "banana", "orange"],
            expression: '$.join(", ")'
          }
        },
        {
          name: 'flatMap(fn)',
          description: 'Maps and flattens result by one level.',
          syntax: '$.array.flatMap(fn)',
          example: `$.arr.flatMap(x => [x, x * 2])
// Input: [1, 2, 3]
// Output: [1, 2, 2, 4, 3, 6]`,
          playground: {
            data: ["Hello World", "How are you"],
            expression: '$.flatMap(str => str.split(" "))'
          }
        },
        {
          name: 'forEach(fn)',
          description: 'Executes function for each element.',
          syntax: '$.array.forEach(fn)',
          example: `$.items.forEach(item => console.log(item))
// Logs each item`,
          playground: {
            data: [1, 2, 3],
            expression: '$.forEach(n => console.log(n))'
          }
        },
        {
          name: 'fill(value, start?, end?)',
          description: 'Fills array with static value.',
          syntax: '$.array.fill(value, start?, end?)',
          example: `$.arr.fill(0, 1, 3)
// Input: [1, 2, 3, 4]
// Output: [1, 0, 0, 4]`,
          playground: {
            data: [1, 2, 3, 4, 5],
            expression: '$.fill("X", 1, 4)'
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
      name: 'String Methods', 
      description: 'Methods for string manipulation and transformation',
      methods: [
        {
          name: 'split(separator, limit?)',
          description: 'Splits string into array of substrings.',
          syntax: '$.string.split(separator, limit?)',
          example: `$.text.split(",")
// Input: "apple,banana,orange"
// Output: ["apple", "banana", "orange"]`,
          playground: {
            data: "hello-world-from-jsq",
            expression: '$.split("-")'
          }
        },
        {
          name: 'replace(search, replacement)',
          description: 'Replaces first occurrence of search string.',
          syntax: '$.string.replace(search, replacement)',
          example: `$.message.replace("old", "new")
// Input: "old value and old data"
// Output: "new value and old data"`,
          playground: {
            data: "Hello World from JSQ",
            expression: '$.replace("World", "Universe")'
          }
        },
        {
          name: 'replaceAll(search, replacement)',
          description: 'Replaces all occurrences of search string.',
          syntax: '$.string.replaceAll(search, replacement)',
          example: `$.message.replaceAll("old", "new")
// Input: "old value and old data"
// Output: "new value and new data"`,
          playground: {
            data: "foo bar foo baz foo",
            expression: '$.replaceAll("foo", "hello")'
          }
        },
        {
          name: 'toLowerCase() / toUpperCase()',
          description: 'Converts string to lowercase/uppercase.',
          syntax: '$.string.toLowerCase() / $.string.toUpperCase()',
          example: `$.text.toLowerCase()  // "hello world"
$.text.toUpperCase()  // "HELLO WORLD"`,
          playground: {
            data: "Hello World from JSQ",
            expression: '$.toLowerCase()'
          }
        },
        {
          name: 'trim() / trimStart() / trimEnd()',
          description: 'Removes whitespace from string.',
          syntax: '$.string.trim() / $.string.trimStart() / $.string.trimEnd()',
          example: `$.text.trim()       // "hello" (from "  hello  ")
$.text.trimStart()  // "hello  " (from "  hello  ")
$.text.trimEnd()    // "  hello" (from "  hello  ")`,
          playground: {
            data: "   Hello World   ",
            expression: '$.trim()'
          }
        },
        {
          name: 'substring(start, end?)',
          description: 'Extracts substring between indices.',
          syntax: '$.string.substring(start, end?)',
          example: `$.text.substring(0, 5)
// Input: "Hello World"
// Output: "Hello"`,
          playground: {
            data: "JavaScript is awesome",
            expression: '$.substring(0, 10)'
          }
        },
        {
          name: 'slice(start, end?)',
          description: 'Extracts section of string (supports negative indices).',
          syntax: '$.string.slice(start, end?)',
          example: `$.text.slice(-5)     // Last 5 characters
$.text.slice(0, -5)  // All except last 5`,
          playground: {
            data: "Hello World",
            expression: '$.slice(-5)'
          }
        },
        {
          name: 'charAt(index)',
          description: 'Returns character at specified index.',
          syntax: '$.string.charAt(index)',
          example: `$.text.charAt(0)   // First character
$.text.charAt(5)   // Character at index 5`,
          playground: {
            data: "Hello World",
            expression: '$.charAt(6)'
          }
        },
        {
          name: 'charCodeAt(index)',
          description: 'Returns Unicode value of character at index.',
          syntax: '$.string.charCodeAt(index)',
          example: `$.text.charCodeAt(0)
// Input: "A"
// Output: 65`,
          playground: {
            data: "ABC",
            expression: '$.charCodeAt(0)'
          }
        },
        {
          name: 'indexOf(search, fromIndex?)',
          description: 'Returns first index of substring.',
          syntax: '$.string.indexOf(search, fromIndex?)',
          example: `$.text.indexOf("world")
// Input: "hello world"
// Output: 6`,
          playground: {
            data: "Hello wonderful world",
            expression: '$.indexOf("world")'
          }
        },
        {
          name: 'lastIndexOf(search, fromIndex?)',
          description: 'Returns last index of substring.',
          syntax: '$.string.lastIndexOf(search, fromIndex?)',
          example: `$.text.lastIndexOf("o")
// Input: "hello world"
// Output: 7`,
          playground: {
            data: "Hello world, wonderful world",
            expression: '$.lastIndexOf("world")'
          }
        },
        {
          name: 'includes(search)',
          description: 'Checks if string contains substring.',
          syntax: '$.string.includes(search)',
          example: `$.text.includes("world")
// Input: "hello world"
// Output: true`,
          playground: {
            data: "JavaScript is awesome",
            expression: '$.includes("Script")'
          }
        },
        {
          name: 'startsWith(search)',
          description: 'Checks if string starts with substring.',
          syntax: '$.string.startsWith(search)',
          example: `$.text.startsWith("hello")
// Input: "hello world"
// Output: true`,
          playground: {
            data: "Hello World",
            expression: '$.startsWith("Hello")'
          }
        },
        {
          name: 'endsWith(search)',
          description: 'Checks if string ends with substring.',
          syntax: '$.string.endsWith(search)',
          example: `$.text.endsWith("world")
// Input: "hello world"
// Output: true`,
          playground: {
            data: "Hello World",
            expression: '$.endsWith("World")'
          }
        },
        {
          name: 'repeat(count)',
          description: 'Repeats string specified number of times.',
          syntax: '$.string.repeat(count)',
          example: `$.text.repeat(3)
// Input: "abc"
// Output: "abcabcabc"`,
          playground: {
            data: "Hi! ",
            expression: '$.repeat(3)'
          }
        }
      ]
    },
    {
      name: 'Functional Programming Methods',
      description: 'Advanced functional programming methods inspired by Haskell and modern FP',
      methods: [
        {
          name: 'fold(fn, initial) / foldLeft(fn, initial)',
          description: 'Reduces array from left to right (same as reduce).',
          syntax: '$.array.fold(fn, initial)',
          example: `$.numbers.fold((acc, n) => acc + n, 0)
// Input: [1, 2, 3, 4]
// Output: 10`,
          playground: {
            data: [1, 2, 3, 4, 5],
            expression: '$.fold((acc, val) => acc * val, 1)'
          }
        },
        {
          name: 'foldRight(fn, initial)',
          description: 'Reduces array from right to left.',
          syntax: '$.array.foldRight(fn, initial)',
          example: `$.letters.foldRight((char, acc) => acc + char, "")
// Input: ["a", "b", "c"]
// Output: "cba"`,
          playground: {
            data: ["hello", "world", "from", "jsq"],
            expression: '$.foldRight((word, acc) => acc + " " + word, "").trim()'
          }
        },
        {
          name: 'scan(fn, initial) / scanLeft(fn, initial)',
          description: 'Like fold but returns array of intermediate results.',
          syntax: '$.array.scan(fn, initial)',
          example: `$.numbers.scan((acc, n) => acc + n, 0)
// Input: [1, 2, 3, 4]
// Output: [0, 1, 3, 6, 10]`,
          playground: {
            data: [1, 2, 3, 4, 5],
            expression: '$.scan((acc, val) => acc + val, 0)'
          }
        },
        {
          name: 'scanRight(fn, initial)',
          description: 'Like foldRight but returns array of intermediate results.',
          syntax: '$.array.scanRight(fn, initial)',
          example: `$.numbers.scanRight((n, acc) => n + acc, 0)
// Input: [1, 2, 3, 4]
// Output: [10, 9, 7, 4, 0]`,
          playground: {
            data: [1, 2, 3, 4],
            expression: '$.scanRight((val, acc) => val + acc, 0)'
          }
        },
        {
          name: 'zip(...arrays)',
          description: 'Combines arrays element-wise into tuples.',
          syntax: '$.array.zip(...arrays)',
          example: `$.names.zip(ages, cities)
// Input: ["Alice", "Bob"], [25, 30], ["NYC", "LA"]
// Output: [["Alice", 25, "NYC"], ["Bob", 30, "LA"]]`,
          playground: {
            data: ["a", "b", "c"],
            expression: '$.zip([1, 2, 3], ["x", "y", "z"])'
          }
        },
        {
          name: 'zipWith(fn, ...arrays)',
          description: 'Combines arrays element-wise using function.',
          syntax: '$.array.zipWith(fn, ...arrays)',
          example: `$.prices.zipWith((a, b) => a + b, taxes)
// Input: [100, 200], [10, 20]
// Output: [110, 220]`,
          playground: {
            data: [1, 2, 3],
            expression: '$.zipWith((a, b) => a * b, [10, 20, 30])'
          }
        },
        {
          name: 'unzip()',
          description: 'Transposes array of arrays.',
          syntax: '$.array.unzip()',
          example: `$.tuples.unzip()
// Input: [["a", 1], ["b", 2], ["c", 3]]
// Output: [["a", "b", "c"], [1, 2, 3]]`,
          playground: {
            data: [["Alice", 25], ["Bob", 30], ["Charlie", 35]],
            expression: '$.unzip()'
          }
        },
        {
          name: 'sliding(size, step?)',
          description: 'Creates sliding windows over array.',
          syntax: '$.array.sliding(size, step = 1)',
          example: `$.numbers.sliding(3)
// Input: [1, 2, 3, 4, 5]
// Output: [[1, 2, 3], [2, 3, 4], [3, 4, 5]]`,
          playground: {
            data: [1, 2, 3, 4, 5, 6],
            expression: '$.sliding(3, 2)'
          }
        },
        {
          name: 'head()',
          description: 'Returns first element (Haskell-style).',
          syntax: '$.array.head()',
          example: `$.list.head()
// Input: [1, 2, 3]
// Output: 1`,
          playground: {
            data: ["first", "second", "third"],
            expression: '$.head()'
          }
        },
        {
          name: 'tail()',
          description: 'Returns all elements except first (Haskell-style).',
          syntax: '$.array.tail()',
          example: `$.list.tail()
// Input: [1, 2, 3]
// Output: [2, 3]`,
          playground: {
            data: ["first", "second", "third"],
            expression: '$.tail()'
          }
        },
        {
          name: 'init()',
          description: 'Returns all elements except last (Haskell-style).',
          syntax: '$.array.init()',
          example: `$.list.init()
// Input: [1, 2, 3]
// Output: [1, 2]`,
          playground: {
            data: ["first", "second", "third"],
            expression: '$.init()'
          }
        },
        {
          name: 'last()',
          description: 'Returns last element (Haskell-style).',
          syntax: '$.array.last()',
          example: `$.list.last()
// Input: [1, 2, 3]
// Output: 3`,
          playground: {
            data: ["first", "second", "third"],
            expression: '$.last()'
          }
        },
        {
          name: 'cons(element)',
          description: 'Prepends element to array (Haskell-style).',
          syntax: '$.array.cons(element)',
          example: `$.list.cons(0)
// Input: [1, 2, 3]
// Output: [0, 1, 2, 3]`,
          playground: {
            data: [2, 3, 4],
            expression: '$.cons(1)'
          }
        },
        {
          name: 'snoc(element)',
          description: 'Appends element to array (cons reversed).',
          syntax: '$.array.snoc(element)',
          example: `$.list.snoc(4)
// Input: [1, 2, 3]
// Output: [1, 2, 3, 4]`,
          playground: {
            data: [1, 2, 3],
            expression: '$.snoc(4)'
          }
        },
        {
          name: 'tails()',
          description: 'Returns all tail subsequences.',
          syntax: '$.array.tails()',
          example: `$.list.tails()
// Input: [1, 2, 3]
// Output: [[1, 2, 3], [2, 3], [3], []]`,
          playground: {
            data: ["a", "b", "c"],
            expression: '$.tails()'
          }
        },
        {
          name: 'inits()',
          description: 'Returns all initial subsequences.',
          syntax: '$.array.inits()',
          example: `$.list.inits()
// Input: [1, 2, 3]
// Output: [[], [1], [1, 2], [1, 2, 3]]`,
          playground: {
            data: ["a", "b", "c"],
            expression: '$.inits()'
          }
        },
        {
          name: 'span(predicate)',
          description: 'Splits array where predicate first becomes false.',
          syntax: '$.array.span(predicate)',
          example: `$.numbers.span(n => n < 5)
// Input: [1, 3, 5, 2, 7]
// Output: [[1, 3], [5, 2, 7]]`,
          playground: {
            data: [2, 4, 6, 7, 8, 10],
            expression: '$.span(n => n % 2 === 0)'
          }
        },
        {
          name: 'breakAt(predicate)',
          description: 'Splits array where predicate first becomes true.',
          syntax: '$.array.breakAt(predicate)',
          example: `$.numbers.breakAt(n => n > 5)
// Input: [1, 3, 7, 2, 9]
// Output: [[1, 3], [7, 2, 9]]`,
          playground: {
            data: [1, 2, 3, 4, 5, 6],
            expression: '$.breakAt(n => n > 3)'
          }
        },
        {
          name: 'intersperse(separator)',
          description: 'Inserts separator between elements.',
          syntax: '$.array.intersperse(separator)',
          example: `$.words.intersperse("-")
// Input: ["hello", "world"]
// Output: ["hello", "-", "world"]`,
          playground: {
            data: ["apple", "banana", "orange"],
            expression: '$.intersperse(" and ")'
          }
        },
        {
          name: 'intercalate(separator, arrays)',
          description: 'Flattens and intersperses arrays.',
          syntax: '$.array.intercalate(separator, arrays)',
          example: `$([","]).intercalate([["a", "b"], ["c", "d"]])
// Output: ["a", "b", ",", "c", "d"]`,
          playground: {
            data: [[1, 2], [3, 4], [5, 6]],
            expression: '$([0]).intercalate($)'
          }
        },
        {
          name: 'partition(predicate)',
          description: 'Splits array into two based on predicate.',
          syntax: '$.array.partition(predicate)',
          example: `$.numbers.partition(n => n % 2 === 0)
// Input: [1, 2, 3, 4, 5]
// Output: [[2, 4], [1, 3, 5]]`,
          playground: {
            data: [1, 2, 3, 4, 5, 6, 7, 8],
            expression: '$.partition(n => n > 4)'
          }
        },
        {
          name: 'transpose()',
          description: 'Transposes rows and columns.',
          syntax: '$.array.transpose()',
          example: `$.matrix.transpose()
// Input: [[1, 2, 3], [4, 5, 6]]
// Output: [[1, 4], [2, 5], [3, 6]]`,
          playground: {
            data: [["a", "b", "c"], [1, 2, 3], ["x", "y", "z"]],
            expression: '$.transpose()'
          }
        },
        {
          name: 'cycle(n)',
          description: 'Repeats array n times.',
          syntax: '$.array.cycle(n)',
          example: `$.pattern.cycle(3)
// Input: ["a", "b"]
// Output: ["a", "b", "a", "b", "a", "b"]`,
          playground: {
            data: [1, 2, 3],
            expression: '$.cycle(2)'
          }
        },
        {
          name: 'takeWhile(predicate)',
          description: 'Takes elements while predicate is true.',
          syntax: '$.array.takeWhile(predicate)',
          example: `$.numbers.takeWhile(n => n < 5)
// Input: [1, 3, 5, 2, 7]
// Output: [1, 3]`,
          playground: {
            data: [2, 4, 6, 7, 8, 10],
            expression: '$.takeWhile(n => n % 2 === 0)'
          }
        },
        {
          name: 'dropWhile(predicate)',
          description: 'Drops elements while predicate is true.',
          syntax: '$.array.dropWhile(predicate)',
          example: `$.numbers.dropWhile(n => n < 5)
// Input: [1, 3, 5, 2, 7]
// Output: [5, 2, 7]`,
          playground: {
            data: [1, 2, 3, 4, 5, 6],
            expression: '$.dropWhile(n => n < 4)'
          }
        },
        {
          name: 'distinctBy(iteratee)',
          description: 'Returns unique elements based on iteratee.',
          syntax: '$.array.distinctBy(iteratee)',
          example: `$.items.distinctBy(item => item.category)
// Keeps first occurrence of each category`,
          playground: {
            data: [{id: 1, type: "A"}, {id: 2, type: "B"}, {id: 3, type: "A"}],
            expression: '$.distinctBy(item => item.type)'
          }
        },
        {
          name: 'when(condition, fn)',
          description: 'Applies function if condition is true.',
          syntax: '$.value.when(condition, fn)',
          example: `$.data.when(data => data.length > 5, arr => arr.slice(0, 5))
// Truncates only if length > 5`,
          playground: {
            data: [1, 2, 3, 4, 5, 6, 7],
            expression: '$.when(arr => arr.length > 5, arr => arr.filter(n => n % 2 === 0))'
          }
        },
        {
          name: 'unless(condition, fn)',
          description: 'Applies function if condition is false.',
          syntax: '$.value.unless(condition, fn)',
          example: `$.data.unless(data => data.isEmpty(), arr => arr.sort())
// Sorts only if not empty`,
          playground: {
            data: [3, 1, 4, 1, 5],
            expression: '$.unless(arr => arr.length < 3, arr => arr.sort())'
          }
        },
        {
          name: 'tee(fn)',
          description: 'Executes side effect and returns original value.',
          syntax: '$.value.tee(fn)',
          example: `$.data
  .tee(data => analytics.track("processed", data))
  .filter(item => item.valid)`,
          playground: {
            data: [1, 2, 3],
            expression: '$.tee(arr => console.log("Array length:", arr.length)).map(n => n * 2)'
          }
        },
        {
          name: 'debug(label?)',
          description: 'Logs value with optional label and returns it.',
          syntax: '$.value.debug(label?)',
          example: `$.data
  .debug("before filter")
  .filter(x => x > 0)
  .debug("after filter")`,
          playground: {
            data: {name: "test", value: 42},
            expression: '$.debug("Current data:").pluck("value")'
          }
        },
        {
          name: 'benchmark(label?)',
          description: 'Measures execution time and returns value.',
          syntax: '$.value.benchmark(label?)',
          example: `$.bigData
  .benchmark("sorting")
  .sortBy("timestamp")
  .benchmark("filtering")
  .filter(item => item.active)`,
          playground: {
            data: [1, 2, 3, 4, 5],
            expression: '$.benchmark("Processing").map(n => n * n).benchmark("Done")'
          }
        }
      ]
    },
    {
      name: 'Type Conversion Methods',
      description: 'Methods for converting between different data types',
      methods: [
        {
          name: 'toString()',
          description: 'Converts value to string.',
          syntax: '$.value.toString()',
          example: `$.number.toString()
// Input: 42
// Output: "42"`,
          playground: {
            data: [1, 2, 3],
            expression: '$.toString()'
          }
        },
        {
          name: 'toNumber()',
          description: 'Converts value to number.',
          syntax: '$.value.toNumber()',
          example: `$.string.toNumber()
// Input: "42"
// Output: 42`,
          playground: {
            data: "123.45",
            expression: '$.toNumber()'
          }
        },
        {
          name: 'toBoolean()',
          description: 'Converts value to boolean.',
          syntax: '$.value.toBoolean()',
          example: `$.value.toBoolean()
// Truthy values => true
// Falsy values => false`,
          playground: {
            data: "hello",
            expression: '$.toBoolean()'
          }
        },
        {
          name: 'toArray()',
          description: 'Converts value to array.',
          syntax: '$.value.toArray()',
          example: `$.string.toArray()
// Input: "hello"
// Output: ["h", "e", "l", "l", "o"]`,
          playground: {
            data: {a: 1, b: 2, c: 3},
            expression: '$.toArray()'
          }
        }
      ]
    },
    {
      name: 'Number Methods',
      description: 'Methods for number formatting and manipulation',
      methods: [
        {
          name: 'toFixed(digits)',
          description: 'Formats number to fixed decimal places.',
          syntax: '$.number.toFixed(digits)',
          example: `$.price.toFixed(2)
// Input: 19.99999
// Output: "20.00"`,
          playground: {
            data: 3.14159265359,
            expression: '$.toFixed(2)'
          }
        },
        {
          name: 'toExponential(fractionDigits?)',
          description: 'Returns exponential notation string.',
          syntax: '$.number.toExponential(fractionDigits?)',
          example: `$.bigNumber.toExponential(2)
// Input: 123456
// Output: "1.23e+5"`,
          playground: {
            data: 0.0000123,
            expression: '$.toExponential(2)'
          }
        },
        {
          name: 'toPrecision(precision)',
          description: 'Formats number to specified precision.',
          syntax: '$.number.toPrecision(precision)',
          example: `$.value.toPrecision(4)
// Input: 123.456
// Output: "123.5"`,
          playground: {
            data: 123.456789,
            expression: '$.toPrecision(5)'
          }
        }
      ]
    },
    {
      name: 'Advanced Utility Methods',
      description: 'Additional utility methods for advanced operations',
      methods: [
        {
          name: 'value() / valueOf()',
          description: 'Extracts the wrapped value.',
          syntax: '$.wrapped.value() / $.wrapped.valueOf()',
          example: `$.data.filter(x => x > 0).value()
// Returns the actual array`,
          playground: {
            data: [1, 2, 3, 4, 5],
            expression: '$.filter(n => n > 2).value()'
          }
        },
        {
          name: 'isNull()',
          description: 'Checks if value is null.',
          syntax: '$.value.isNull()',
          example: `$.data.isNull()
// Input: null
// Output: true`,
          playground: {
            data: null,
            expression: '$.isNull()'
          }
        },
        {
          name: 'isUndefined()',
          description: 'Checks if value is undefined.',
          syntax: '$.value.isUndefined()',
          example: `$.data.isUndefined()
// Input: undefined
// Output: true`,
          playground: {
            data: undefined,
            expression: '$.isUndefined()'
          }
        },
        {
          name: 'isNil()',
          description: 'Checks if value is null or undefined.',
          syntax: '$.value.isNil()',
          example: `$.data.isNil()
// Input: null or undefined
// Output: true`,
          playground: {
            data: null,
            expression: '$.isNil()'
          }
        },
        {
          name: 'isArray()',
          description: 'Checks if value is an array.',
          syntax: '$.value.isArray()',
          example: `$.data.isArray()
// Input: [1, 2, 3]
// Output: true`,
          playground: {
            data: [1, 2, 3],
            expression: '$.isArray()'
          }
        },
        {
          name: 'isObject()',
          description: 'Checks if value is an object.',
          syntax: '$.value.isObject()',
          example: `$.data.isObject()
// Input: {a: 1}
// Output: true`,
          playground: {
            data: {name: "test", value: 42},
            expression: '$.isObject()'
          }
        },
        {
          name: 'isString()',
          description: 'Checks if value is a string.',
          syntax: '$.value.isString()',
          example: `$.data.isString()
// Input: "hello"
// Output: true`,
          playground: {
            data: "Hello World",
            expression: '$.isString()'
          }
        },
        {
          name: 'isNumber()',
          description: 'Checks if value is a number.',
          syntax: '$.value.isNumber()',
          example: `$.data.isNumber()
// Input: 42
// Output: true`,
          playground: {
            data: 42,
            expression: '$.isNumber()'
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
    this.setupScrollListener();
    this.expandedCategories.add(this.categories[0].name);
    this.checkViewportSize();
    window.addEventListener('resize', () => this.checkViewportSize());
  }
  
  private checkViewportSize(): void {
    const isMobile = window.innerWidth <= 1024;
    if (!isMobile && this.isSidebarOpen) {
      this.isSidebarOpen = false;
    }
  }
  
  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
  
  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  getCategoryId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-');
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
      
      const chainingSection = document.getElementById('method-chaining');
      if (chainingSection) {
        const rect = chainingSection.getBoundingClientRect();
        const elementTop = rect.top + scrollTop;
        const distance = Math.abs(elementTop - triggerPoint);
        
        if (closestElement && distance < (closestElement as { category: string; method: string; section: string; distance: number }).distance) {
          closestElement = {
            category: '',
            method: '',
            section: 'method-chaining',
            distance: distance
          };
        }
      }
      
      if (closestElement) {
        this.activeCategory = closestElement.category;
        this.activeMethod = closestElement.method;
        this.activeSection = closestElement.section;
        
        if (closestElement.category && !this.expandedCategories.has(closestElement.category)) {
          this.expandedCategories.add(closestElement.category);
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
}