import { ASYNC_METHODS, SMART_DOLLAR_METHODS } from './smart-dollar-shared-methods';

// Extract the entire code including helper functions
const codeMatch = SMART_DOLLAR_METHODS.match(
  /if \(typeof smartDollarMethods === 'undefined'\) \{[\s\S]*\}/
);
if (!codeMatch) {
  throw new Error('Failed to extract code from SMART_DOLLAR_METHODS');
}

// Evaluate the entire code to get methods and helpers
const evalCode = new Function(`
  ${codeMatch[0]}
  return globalThis.smartDollarMethods;
`);
const methods = evalCode();

// Extract the createNewInstance helper
const createNewInstanceMatch = SMART_DOLLAR_METHODS.match(
  /const createNewInstance = function\(data\) \{[\s\S]*?\n {2}\};/
);
if (!createNewInstanceMatch) {
  throw new Error('Failed to extract createNewInstance function');
}

// Create a proper createNewInstance function for non-VM context
const createNewInstance = function (this: any, data: unknown) {
  return new ChainableWrapper(data);
};

export class ChainableWrapper {
  readonly data: unknown;

  constructor(value: unknown) {
    this.data = value;
  }

  get length(): number {
    if (Array.isArray(this.data) || typeof this.data === 'string') {
      return this.data.length;
    }
    if (this.data && typeof this.data === 'object') {
      return Object.keys(this.data).length;
    }
    return 0;
  }

  [Symbol.iterator]() {
    if (Array.isArray(this.data) || typeof this.data === 'string') {
      return this.data[Symbol.iterator]();
    }
    if (this.data && typeof this.data === 'object') {
      return Object.entries(this.data)[Symbol.iterator]();
    }
    return [][Symbol.iterator]();
  }

  toJSON() {
    return this.data;
  }
}

// Apply all methods to ChainableWrapper prototype
Object.entries(methods).forEach(([name, fn]) => {
  (ChainableWrapper.prototype as unknown as Record<string, unknown>)[name] = function (
    this: ChainableWrapper,
    ...args: unknown[]
  ) {
    // Create a context object that mimics VM SmartDollar instance
    const context = {
      _value: this.data,
      constructor: ChainableWrapper,
    };

    // Make createNewInstance available in the method context
    const originalGlobalCreateNewInstance = (globalThis as any).createNewInstance;
    (globalThis as any).createNewInstance = createNewInstance;

    try {
      // Use the context with the method
      const result = (fn as (...args: any[]) => any).apply(context, args);

      // If the result has _value property, it's likely a ChainableWrapper from the VM methods
      if (result && typeof result === 'object' && '_value' in result) {
        return new ChainableWrapper(result._value);
      }

      return result;
    } finally {
      // Restore original state
      if (originalGlobalCreateNewInstance !== undefined) {
        (globalThis as any).createNewInstance = originalGlobalCreateNewInstance;
      } else {
        (globalThis as any).createNewInstance = undefined;
      }
    }
  };
});

// Create async versions of specified methods
ASYNC_METHODS.forEach(methodName => {
  const originalMethod = (ChainableWrapper.prototype as unknown as Record<string, unknown>)[
    methodName
  ];
  if (originalMethod) {
    (ChainableWrapper.prototype as unknown as Record<string, unknown>)[`${methodName}Async`] =
      async function (this: ChainableWrapper, ...args: unknown[]) {
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

        return (originalMethod as (...args: any[]) => any).apply(this, processedArgs);
      };
  }
});

// Add specific async methods
(ChainableWrapper.prototype as unknown as Record<string, unknown>).mapAsync = async function (
  this: ChainableWrapper,
  fn: (value: unknown, index: number, array: unknown[]) => unknown | Promise<unknown>
) {
  // Convert to array using same logic as toArray method
  let arr: unknown[];
  if (Array.isArray(this.data)) {
    arr = Array.from(this.data);
  } else {
    // For non-arrays, treat as single value
    arr = [this.data];
  }
  const promises = arr.map((item, index) => fn(item, index, arr));
  const results = await Promise.all(promises);
  return new ChainableWrapper(results);
};

(ChainableWrapper.prototype as unknown as Record<string, unknown>).mapAsyncSeq = async function (
  this: ChainableWrapper,
  fn: (value: unknown, index: number, array: unknown[]) => unknown | Promise<unknown>
) {
  const results = [];
  // Convert to array using same logic as toArray method
  let arr: unknown[];
  if (Array.isArray(this.data)) {
    arr = Array.from(this.data);
  } else {
    // For non-arrays, treat as single value
    arr = [this.data];
  }
  for (let i = 0; i < arr.length; i++) {
    results.push(await fn(arr[i], i, arr));
  }
  return new ChainableWrapper(results);
};

(ChainableWrapper.prototype as unknown as Record<string, unknown>).forEachAsync = async function (
  this: ChainableWrapper,
  fn: (value: unknown, index: number, array: unknown[]) => unknown | Promise<unknown>
) {
  // Convert to array using same logic as toArray method
  let arr: unknown[];
  if (Array.isArray(this.data)) {
    arr = Array.from(this.data);
  } else {
    // For non-arrays, treat as single value
    arr = [this.data];
  }
  const promises = arr.map((item, index) => fn(item, index, arr));
  await Promise.all(promises);
};

(ChainableWrapper.prototype as unknown as Record<string, unknown>).forEachAsyncSeq =
  async function (
    this: ChainableWrapper,
    fn: (value: unknown, index: number, array: unknown[]) => unknown | Promise<unknown>
  ) {
    // Convert to array using same logic as toArray method
    let arr: unknown[];
    if (Array.isArray(this.data)) {
      arr = Array.from(this.data);
    } else {
      // For non-arrays, treat as single value
      arr = [this.data];
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
        if (Array.isArray(target.data)) {
          const item = target.data[index];
          return item !== undefined ? $(item) : undefined;
        }
      }

      // Property access on the wrapped value
      const value = target.data;
      if (value && typeof value === 'object' && prop in value) {
        const propValue = (value as any)[prop];
        return typeof propValue === 'function' ? propValue.bind(value) : $(propValue);
      }

      return undefined;
    },

    has(target, prop) {
      if (prop in target) return true;
      const value = target.data;
      return !!(value && typeof value === 'object' && prop in value);
    },
  }) as SmartDollar;
}

// Create smart dollar function with proxy
export function createSmartDollar(value: any): SmartDollar {
  const wrapper = new ChainableWrapper(value);
  return createSmartDollarProxy(wrapper);
}
