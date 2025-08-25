import { LODASH_DOLLAR_METHODS, VM_LODASH_DOLLAR_CLASS } from './lodash-dollar-shared-methods';

export function createVMLodashDollarCode(): string {
  return `
${LODASH_DOLLAR_METHODS}

// Simplified LodashDollar class for VM environment
if (typeof LodashDollar === 'undefined') {
  globalThis.LodashDollar = class LodashDollar {
    constructor(value) {
      this._value = value;
      // Don't set this.value here - it conflicts with the value() method
      this.__isLodashDollar = true;
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
    
    [Symbol.toPrimitive](hint) {
      if (hint === 'string') {
        return this.toString();
      }
      return this._value;
    }
  };
}

// Apply all methods to LodashDollar prototype
if (typeof globalThis.lodashDollarMethods !== 'undefined' && typeof globalThis.LodashDollar !== 'undefined') {
  Object.entries(globalThis.lodashDollarMethods).forEach(([name, fn]) => {
    globalThis.LodashDollar.prototype[name] = fn;
  });
}

// Create _ function first before using it in the setup
globalThis.createLodashDollar = function(value) {
  return new globalThis.LodashDollar(value);
};

// Set up _ for direct use (always override)
// Create _ as a function that wraps values
globalThis._ = function(value) {
  if (arguments.length === 0) {
    // If called without arguments and data exists, use data
    if (typeof globalThis.data !== 'undefined') {
      return new globalThis.LodashDollar(globalThis.data);
    }
    // Otherwise return undefined
    return undefined;
  }
  return new globalThis.LodashDollar(value);
};

// Add static methods to _ (like _.chunk, _.filter, etc)
Object.entries(globalThis.lodashDollarMethods).forEach(([name, fn]) => {
  globalThis._[name] = function(...args) {
    // For static methods, wrap the first argument
    if (args.length > 0) {
      const wrapped = new globalThis.LodashDollar(args[0]);
      const result = wrapped[name](...args.slice(1));
      // If result is a LodashDollar instance, unwrap it for static methods
      if (result && result.__isLodashDollar) {
        return result._value;
      }
      return result;
    }
    // For methods that don't need arguments
    return fn.call({_value: undefined, constructor: globalThis.LodashDollar});
  };
});
`;
}

export function getVMLodashInitCode(): string {
  return createVMLodashDollarCode();
}