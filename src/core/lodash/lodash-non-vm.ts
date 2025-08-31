import { LODASH_METHODS } from './lodash-shared-methods';

// Extract method definitions from the string
const methodsMatch = LODASH_METHODS.match(/globalThis\.lodashMethods = ({[\s\S]*});/);
if (!methodsMatch || !methodsMatch[1]) {
  throw new Error('Failed to extract methods from LODASH_METHODS');
}
const methodsCode = methodsMatch[1];

// Create function to evaluate the methods object
const createMethods = new Function(`return ${methodsCode}`);
const methods = createMethods();

export class Lodash {
  _value: unknown;
  __isLodash: boolean;

  constructor(value: unknown) {
    this._value = value;
    this.__isLodash = true;
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
    if (this._value === null || this._value === undefined) {
      return [][Symbol.iterator]();
    }
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

  valueOf() {
    return this._value;
  }

  toString() {
    if (this._value === null) return 'null';
    if (this._value === undefined) return 'undefined';
    return String(this._value);
  }

  [Symbol.toPrimitive](hint: string) {
    if (hint === 'string') {
      return this.toString();
    }
    return this._value;
  }
}

// Apply all methods to Lodash prototype
Object.entries(methods).forEach(([name, fn]) => {
  (Lodash.prototype as unknown as Record<string, unknown>)[name] = function (
    this: Lodash,
    ...args: unknown[]
  ) {
    // Use 'this' context with the method
    return (fn as (...args: unknown[]) => unknown).apply(this, args);
  };
});

// Internal lodash creation function
function createLodashInstance(value: unknown): Lodash | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  
  const lodash = new Lodash(value);
  
  // Create proxy to handle property access
  return new Proxy(lodash, {
    get(target, prop) {
      // Check if it's a lodash method first
      if (prop in target) {
        const value = target[prop];
        if (typeof value === 'function') {
          return value.bind(target);
        }
        return value;
      }
      
      // Handle numeric indices for arrays
      if (typeof prop === 'string' && !Number.isNaN(Number(prop))) {
        const index = Number(prop);
        if (Array.isArray(target._value) && index >= 0 && index < target._value.length) {
          return target._value[index];
        }
      }
      
      // Check wrapped value properties
      if (target._value !== null && target._value !== undefined && typeof target._value === 'object') {
        const obj = target._value as Record<string, unknown>;
        if (prop in obj) {
          const valueFromData = obj[prop as string];
          
          // Return the property value, wrapping it if it's an object
          if (valueFromData !== null && valueFromData !== undefined && typeof valueFromData === 'object') {
            return createLodashInstance(valueFromData);
          }
          return valueFromData;
        }
      }
      
      return undefined;
    },
    
    set(target, prop, value) {
      // Allow setting properties on the wrapped value
      if (target._value !== null && target._value !== undefined && typeof target._value === 'object') {
        (target._value as Record<string, unknown>)[prop as string] = value;
        return true;
      }
      return false;
    },
    
    has(target, prop) {
      if (prop in target) return true;
      if (target._value !== null && target._value !== undefined && typeof target._value === 'object') {
        return prop in (target._value as object);
      }
      return false;
    }
  }) as Lodash;
}

// Export the lodash function
export function _(...args: unknown[]): Lodash | undefined {
  if (args.length === 0) {
    return undefined;
  }
  return createLodashInstance(args[0]);
}

// Add static methods to _ (like _.chunk, _.filter, etc)
Object.entries(methods).forEach(([name, fn]) => {
  (_ as unknown as Record<string, unknown>)[name] = (...args: unknown[]) => {
    // For static methods, wrap the first argument
    if (args.length > 0) {
      const dataToWrap = args[0];

      const wrapped = new Lodash(dataToWrap);
      const method = wrapped[name as keyof Lodash] as (...args: unknown[]) => unknown;
      const result = method.call(wrapped, ...args.slice(1));
      // Special case: chain method should return the Lodash instance
      if (name === 'chain') {
        return result;
      }
      // If result is a Lodash instance, unwrap it for static methods
      if (
        result &&
        typeof result === 'object' &&
        '__isLodash' in result &&
        result.__isLodash === true
      ) {
        return (result as Lodash)._value;
      }
      return result;
    }
    // For methods that don't need arguments
    return (fn as (...args: unknown[]) => unknown).call({ _value: undefined, constructor: Lodash });
  };
});

// Type definitions for better TypeScript support
export interface LodashStatic {
  (value?: unknown): Lodash | undefined;

  // Array methods
  filter<T>(array: T[], predicate: (value: T, index: number, array: T[]) => boolean): T[];
  map<T, U>(array: T[], iteratee: (value: T, index: number, array: T[]) => U): U[];
  find<T>(array: T[], predicate: (value: T, index: number, array: T[]) => boolean): T | undefined;
  findIndex<T>(array: T[], predicate: (value: T, index: number, array: T[]) => boolean): number;
  reduce<T, U>(
    array: T[],
    iteratee: (acc: U, value: T, index: number, array: T[]) => U,
    accumulator?: U
  ): U;

  // Lodash specific array methods
  where<T>(array: T[], properties: Partial<T>): T[];
  pluck<T, K extends keyof T>(array: T[], property: K): T[K][];
  sortBy<T>(array: T[], iteratee: string | ((value: T) => unknown)): T[];
  orderBy<T>(
    array: T[],
    iteratees: string | string[] | ((value: T) => unknown) | ((value: T) => unknown)[],
    orders?: ('asc' | 'desc')[]
  ): T[];
  groupBy<T>(array: T[], iteratee: string | ((value: T) => string | number)): Record<string, T[]>;
  countBy<T>(
    array: T[],
    iteratee: string | ((value: T) => string | number)
  ): Record<string, number>;
  keyBy<T>(array: T[], iteratee: string | ((value: T) => string | number)): Record<string, T>;
  take<T>(array: T[], n: number): T[];
  skip<T>(array: T[], n: number): T[];
  drop<T>(array: T[], n: number): T[];
  takeWhile<T>(array: T[], predicate: (value: T, index: number, array: T[]) => boolean): T[];
  dropWhile<T>(array: T[], predicate: (value: T, index: number, array: T[]) => boolean): T[];
  uniq<T>(array: T[]): T[];
  uniqBy<T>(array: T[], iteratee: string | ((value: T) => unknown)): T[];
  sample<T>(array: T[]): T | undefined;
  sampleSize<T>(array: T[], n: number): T[];
  shuffle<T>(array: T[]): T[];
  flatten<T>(array: T[]): T[];
  flattenDeep(array: unknown[]): unknown[];
  compact<T>(array: T[]): T[];
  chunk<T>(array: T[], size: number): T[][];
  reverse<T>(array: T[]): T[];

  // Math methods
  sum(array: number[]): number;
  mean(array: number[]): number;
  min(array: number[]): number | undefined;
  max(array: number[]): number | undefined;
  minBy<T>(array: T[], iteratee: string | ((value: T) => number)): T | undefined;
  maxBy<T>(array: T[], iteratee: string | ((value: T) => number)): T | undefined;

  // Object methods
  pick<T, K extends keyof T>(object: T, ...keys: K[]): Pick<T, K>;
  omit<T, K extends keyof T>(object: T, ...keys: K[]): Omit<T, K>;
  keys(object: object): string[];
  values<T>(object: { [key: string]: T }): T[];
  entries(object: object): Array<[string, unknown]>;
  fromPairs<T>(pairs: Array<[string, T]>): { [key: string]: T };
  invert(object: object): { [key: string]: string };
  merge<T>(object: T, ...sources: Partial<T>[]): T;
  defaults<T>(object: T, ...sources: Partial<T>[]): T;

  // String methods
  camelCase(string: string): string;
  kebabCase(string: string): string;
  snakeCase(string: string): string;
  startCase(string: string): string;
  upperFirst(string: string): string;
  lowerFirst(string: string): string;
  capitalize(string: string): string;

  // Utility methods
  size(collection: unknown[] | object | string): number;
  isEmpty(value: unknown): boolean;
  includes(collection: unknown[] | object | string, value: unknown, fromIndex?: number): boolean;
  identity<T>(value: T): T;
  constant<T>(value: T): () => T;
  times<T>(n: number, iteratee: (index: number) => T): T[];
  range(start: number, end?: number, step?: number): number[];
  clamp(number: number, lower: number, upper: number): number;
  random(lower: number, upper?: number, floating?: boolean): number;
}

// Export _ as LodashStatic
export const lodash: LodashStatic = _ as LodashStatic;
