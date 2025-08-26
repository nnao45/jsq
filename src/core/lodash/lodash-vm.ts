import { LODASH_METHODS } from './lodash-shared-methods';

export function createVMLodashCode(): string {
  return `
${LODASH_METHODS}

// Simplified Lodash class for VM environment
if (typeof Lodash === 'undefined') {
  globalThis.Lodash = class Lodash {
    constructor(value) {
      this._value = value;
      // Don't set this.value here - it conflicts with the value() method
      this.__isLodash = true;
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

// Apply all methods to Lodash prototype
if (typeof globalThis.lodashMethods !== 'undefined' && typeof globalThis.Lodash !== 'undefined') {
  Object.entries(globalThis.lodashMethods).forEach(([name, fn]) => {
    globalThis.Lodash.prototype[name] = fn;
  });
}

// Create _ function first before using it in the setup
globalThis.createLodash = function(value) {
  return new globalThis.Lodash(value);
};

// Set up _ for direct use (always override)
// Create _ as a function that wraps values
globalThis._ = function(value) {
  if (arguments.length === 0) {
    // If called without arguments and data exists, use data
    if (typeof globalThis.data !== 'undefined') {
      return new globalThis.Lodash(globalThis.data);
    }
    // Otherwise return undefined
    return undefined;
  }
  return new globalThis.Lodash(value);
};

// Add static methods to _ (like _.chunk, _.filter, etc)
Object.entries(globalThis.lodashMethods).forEach(([name, fn]) => {
  globalThis._[name] = function(...args) {
    // For static methods, wrap the first argument
    if (args.length > 0) {
      let dataToWrap = args[0];
      
      // If the first argument is a SmartDollar instance, unwrap it
      if (dataToWrap && typeof dataToWrap === 'object' && dataToWrap.__isSmartDollar) {
        dataToWrap = dataToWrap.valueOf();
      }
      
      const wrapped = new globalThis.Lodash(dataToWrap);
      const result = wrapped[name](...args.slice(1));
      // If result is a Lodash instance, unwrap it for static methods
      if (result && result.__isLodash) {
        return result._value;
      }
      return result;
    }
    // For methods that don't need arguments
    return fn.call({_value: undefined, constructor: globalThis.Lodash});
  };
});
`;
}
