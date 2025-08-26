import { ASYNC_METHODS, SMART_DOLLAR_METHODS } from './smart-dollar-shared-methods';

// Extract method definitions from the string
const methodsMatch = SMART_DOLLAR_METHODS.match(/globalThis\.smartDollarMethods = ({[\s\S]*});/);
if (!methodsMatch || !methodsMatch[1]) {
  throw new Error('Failed to extract methods from SMART_DOLLAR_METHODS');
}
const methodsCode = methodsMatch[1];

// Create function to evaluate the methods object
const createMethods = new Function(`return ${methodsCode}`);
const methods = createMethods();

// Cache for method results
const _methodCache = new WeakMap();

export class ChainableWrapper {
  private _value: unknown;

  constructor(value: unknown) {
    this._value = value;
  }

  // Add data property for compatibility with tests
  get data(): unknown {
    return this._value;
  }

  get length(): number {
    if (Array.isArray(this._value) || typeof this._value === 'string') {
      return this._value.length;
    }
    if (this._value && typeof this._value === 'object') {
      return Object.keys(this._value).length;
    }
    return 0;
  }

  [Symbol.iterator]() {
    if (Array.isArray(this._value) || typeof this._value === 'string') {
      return this._value[Symbol.iterator]();
    }
    if (this._value && typeof this._value === 'object') {
      return Object.entries(this._value)[Symbol.iterator]();
    }
    return [][Symbol.iterator]();
  }

  toJSON() {
    return this._value;
  }
}

// Apply all methods to ChainableWrapper prototype
Object.entries(methods).forEach(([name, fn]) => {
  (ChainableWrapper.prototype as Record<string, unknown>)[name] = function (
    this: ChainableWrapper,
    ...args: unknown[]
  ) {
    // Use 'this' context with the method
    return fn.apply(this, args);
  };
});

// Create async versions of specified methods
ASYNC_METHODS.forEach(methodName => {
  const originalMethod = (ChainableWrapper.prototype as Record<string, unknown>)[methodName];
  if (originalMethod) {
    (ChainableWrapper.prototype as Record<string, unknown>)[`${methodName}Async`] = async function (
      this: ChainableWrapper,
      ...args: unknown[]
    ) {
      // Handle async callbacks
      const processedArgs = await Promise.all(
        args.map(async arg => {
          if (typeof arg === 'function') {
            // Return a wrapped async version of the function
            return async (...fnArgs: unknown[]) => {
              return await arg(...fnArgs);
            };
          }
          return arg;
        })
      );

      return originalMethod.apply(this, processedArgs);
    };
  }
});

// Add specific async methods
(ChainableWrapper.prototype as Record<string, unknown>).mapAsync = async function (
  this: ChainableWrapper,
  fn: Function
) {
  // Convert to array using same logic as toArray method
  let arr: unknown[];
  if (Array.isArray(this._value)) {
    arr = Array.from(this._value);
  } else {
    // For non-arrays, treat as single value
    arr = [this._value];
  }
  const promises = arr.map((item, index) => fn(item, index, arr));
  const results = await Promise.all(promises);
  return new ChainableWrapper(results);
};

(ChainableWrapper.prototype as Record<string, unknown>).mapAsyncSeq = async function (
  this: ChainableWrapper,
  fn: Function
) {
  const results = [];
  // Convert to array using same logic as toArray method
  let arr: unknown[];
  if (Array.isArray(this._value)) {
    arr = Array.from(this._value);
  } else {
    // For non-arrays, treat as single value
    arr = [this._value];
  }
  for (let i = 0; i < arr.length; i++) {
    results.push(await fn(arr[i], i, arr));
  }
  return new ChainableWrapper(results);
};

(ChainableWrapper.prototype as Record<string, unknown>).forEachAsync = async function (
  this: ChainableWrapper,
  fn: Function
) {
  // Convert to array using same logic as toArray method
  let arr: unknown[];
  if (Array.isArray(this._value)) {
    arr = Array.from(this._value);
  } else {
    // For non-arrays, treat as single value
    arr = [this._value];
  }
  const promises = arr.map((item, index) => fn(item, index, arr));
  await Promise.all(promises);
};

(ChainableWrapper.prototype as Record<string, unknown>).forEachAsyncSeq = async function (
  this: ChainableWrapper,
  fn: Function
) {
  // Convert to array using same logic as toArray method
  let arr: unknown[];
  if (Array.isArray(this._value)) {
    arr = Array.from(this._value);
  } else {
    // For non-arrays, treat as single value
    arr = [this._value];
  }
  for (let i = 0; i < arr.length; i++) {
    await fn(arr[i], i, arr);
  }
};

// Export the smart dollar function
export function $(value: unknown): ChainableWrapper {
  return new ChainableWrapper(value);
}

// Type definitions for better TypeScript support
export interface SmartDollar extends ChainableWrapper {
  // Array methods
  map<U>(fn: (item: any, index: number, array: any[]) => U): SmartDollar;
  mapAsync<U>(fn: (item: any, index: number, array: any[]) => Promise<U>): Promise<SmartDollar>;
  filter(fn: (item: any, index: number, array: any[]) => boolean): SmartDollar;
  filterAsync(
    fn: (item: any, index: number, array: any[]) => Promise<boolean>
  ): Promise<SmartDollar>;
  reduce<U>(fn: (acc: U, item: any, index: number, array: any[]) => U, initial?: U): U;
  reduceAsync<U>(
    fn: (acc: U, item: any, index: number, array: any[]) => Promise<U>,
    initial?: U
  ): Promise<U>;
  slice(start?: number, end?: number): SmartDollar;
  concat(...args: any[]): SmartDollar;
  find(fn: (item: any, index: number, array: any[]) => boolean): SmartDollar;
  findAsync(fn: (item: any, index: number, array: any[]) => Promise<boolean>): Promise<SmartDollar>;
  some(fn: (item: any, index: number, array: any[]) => boolean): boolean;
  someAsync(fn: (item: any, index: number, array: any[]) => Promise<boolean>): Promise<boolean>;
  every(fn: (item: any, index: number, array: any[]) => boolean): boolean;
  everyAsync(fn: (item: any, index: number, array: any[]) => Promise<boolean>): Promise<boolean>;
  includes(searchElement: any, fromIndex?: number): boolean;
  indexOf(searchElement: any, fromIndex?: number): number;
  lastIndexOf(searchElement: any, fromIndex?: number): number;
  join(separator?: string): string;
  reverse(): SmartDollar;
  sort(compareFn?: (a: any, b: any) => number): SmartDollar;
  push(...elements: any[]): number;
  pop(): any;
  shift(): any;
  unshift(...elements: any[]): number;
  splice(start: number, deleteCount?: number, ...items: any[]): any[];
  findIndex(predicate: (value: any, index: number, obj: any[]) => boolean, thisArg?: any): number;

  // Object methods
  keys(): SmartDollar;
  values(): SmartDollar;
  entries(): SmartDollar;
  hasOwn(prop: string | number | symbol): boolean;
  assign(...sources: any[]): SmartDollar;

  // String methods
  split(separator: string | RegExp, limit?: number): SmartDollar;
  replace(search: string | RegExp, replacement: string): SmartDollar;
  replaceAll(search: string | RegExp, replacement: string): SmartDollar;
  toLowerCase(): SmartDollar;
  toUpperCase(): SmartDollar;
  trim(): SmartDollar;
  substring(start: number, end?: number): SmartDollar;
  charAt(index: number): string;
  charCodeAt(index: number): number;
  startsWith(searchString: string, position?: number): boolean;
  endsWith(searchString: string, position?: number): boolean;
  padStart(targetLength: number, padString?: string): SmartDollar;
  padEnd(targetLength: number, padString?: string): SmartDollar;
  match(regexp: string | RegExp): SmartDollar;
  search(regexp: string | RegExp): number;

  // Number methods
  toFixed(digits?: number): string;
  toExponential(fractionDigits?: number): string;
  toPrecision(precision?: number): string;

  // Type conversion methods
  toString(): string;
  toNumber(): number;
  toBoolean(): boolean;
  toArray(): any[];

  // Utility methods
  pipe(...fns: Array<(value: any) => any>): SmartDollar;
  pipeAsync(...fns: Array<(value: any) => any | Promise<any>>): Promise<SmartDollar>;
  tap(fn: (value: any) => void): SmartDollar;
  tapAsync(fn: (value: any) => void | Promise<void>): Promise<SmartDollar>;
  value(): any;
  valueOf(): any;
  isNull(): boolean;
  isUndefined(): boolean;
  isNullOrUndefined(): boolean;
  isEmpty(): boolean;

  // Chainable conditions
  when(
    condition: boolean,
    trueFn?: (value: any) => any,
    falseFn?: (value: any) => any
  ): SmartDollar;
  whenAsync(
    condition: boolean,
    trueFn?: (value: any) => any | Promise<any>,
    falseFn?: (value: any) => any | Promise<any>
  ): Promise<SmartDollar>;
  unless(condition: boolean, fn?: (value: any) => any): SmartDollar;
  unlessAsync(condition: boolean, fn?: (value: any) => any | Promise<any>): Promise<SmartDollar>;
}

// Export proxy handler for additional functionality
export function createSmartDollarProxy(wrapper: ChainableWrapper): SmartDollar {
  return new Proxy(wrapper, {
    get(target, prop) {
      // Check if property exists on the wrapper
      if (prop in target) {
        return (target as any)[prop];
      }

      // Check if it's a number (array index)
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        const index = parseInt(prop, 10);
        if (Array.isArray(target._value)) {
          const item = target._value[index];
          return item !== undefined ? $(item) : undefined;
        }
      }

      // Property access on the wrapped value
      const value = target._value;
      if (value && typeof value === 'object' && prop in value) {
        const propValue = value[prop];
        return typeof propValue === 'function' ? propValue.bind(value) : $(propValue);
      }

      return undefined;
    },

    has(target, prop) {
      if (prop in target) return true;
      const value = target._value;
      return value && typeof value === 'object' && prop in value;
    },
  }) as SmartDollar;
}

// Create smart dollar function with proxy
export function createSmartDollar(value: any): SmartDollar {
  const wrapper = new ChainableWrapper(value);
  return createSmartDollarProxy(wrapper);
}
