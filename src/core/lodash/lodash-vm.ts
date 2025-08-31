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

// Create _ function with Proxy support
globalThis.createLodash = function(value) {
  if (value === null || value === undefined) {
    return value;
  }
  
  // Create lodash instance
  const lodash = new globalThis.Lodash(value);
  
  // Create proxy to handle property access
  return new Proxy(lodash, {
    get(target, prop, receiver) {
      // Check if it's a lodash method first
      if (prop in target) {
        const value = target[prop];
        if (typeof value === 'function') {
          return value.bind(target);
        }
        return value;
      }
      
      // Handle numeric indices for arrays
      if (typeof prop === 'string' && !isNaN(Number(prop))) {
        const index = Number(prop);
        if (Array.isArray(target._value) && index >= 0 && index < target._value.length) {
          return target._value[index];
        }
      }
      
      // Check wrapped value properties
      if (target._value !== null && target._value !== undefined && typeof target._value === 'object' && prop in target._value) {
        const valueFromData = target._value[prop];
        
        // Return the property value, wrapping it if it's an object
        if (valueFromData !== null && valueFromData !== undefined && typeof valueFromData === 'object') {
          return globalThis.createLodash(valueFromData);
        }
        return valueFromData;
      }
      
      return undefined;
    },
    
    set(target, prop, value) {
      // Allow setting properties on the wrapped value
      if (target._value !== null && target._value !== undefined && typeof target._value === 'object') {
        target._value[prop] = value;
        return true;
      }
      return false;
    },
    
    has(target, prop) {
      if (prop in target) return true;
      if (target._value !== null && target._value !== undefined && typeof target._value === 'object') {
        return prop in target._value;
      }
      return false;
    }
  });
};

// Set up _ for direct use (always override)
// Create _ as a function that wraps values
globalThis._ = function(value) {
  if (arguments.length === 0) {
    // If called without arguments and data exists AND is not null, use data
    if (typeof globalThis.data !== 'undefined' && globalThis.data !== null) {
      return globalThis.createLodash(globalThis.data);
    }
    // Otherwise return undefined
    return undefined;
  }
  return globalThis.createLodash(value);
};

// Add static methods to _ (like _.chunk, _.filter, etc)
Object.entries(globalThis.lodashMethods).forEach(([name, fn]) => {
  globalThis._[name] = function(...args) {
    // Special handling for pure utility functions that don't operate on data
    if (name === 'range') {
      // _.range(end) or _.range(start, end, step)
      if (args.length === 0) return [];
      if (args.length === 1) {
        // _.range(5) -> [0, 1, 2, 3, 4]
        const end = Number(args[0]) || 0;
        const result = [];
        for (let i = 0; i < end; i++) {
          result.push(i);
        }
        return result;
      } else {
        // _.range(2, 8) or _.range(2, 8, 2)
        const start = Number(args[0]) || 0;
        const end = Number(args[1]) || 0;
        const step = Number(args[2]) || 1;
        const result = [];
        if (step > 0) {
          for (let i = start; i < end; i += step) {
            result.push(i);
          }
        } else {
          for (let i = start; i > end; i += step) {
            result.push(i);
          }
        }
        return result;
      }
    }
    
    if (name === 'times') {
      // _.times(n, iteratee)
      if (args.length === 0) return [];
      const n = Number(args[0]) || 0;
      const iteratee = args[1] || ((i) => i);
      const results = [];
      for (let i = 0; i < n; i++) {
        results.push(iteratee(i));
      }
      return results;
    }
    
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
      if (result && typeof result === 'object' && result.__isLodash) {
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
