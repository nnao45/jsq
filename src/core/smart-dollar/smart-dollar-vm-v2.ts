import { SMART_DOLLAR_METHODS } from './smart-dollar-shared-methods';

// グローバル変数を使わないSmartDollar実装
export function createVMSmartDollarCodeV2(): string {
  return `
// SmartDollar implementation without global variables
(function() {
  ${SMART_DOLLAR_METHODS}
  
  // Forward declare createSmartDollar
  let createSmartDollar;
  
  // Define SmartDollar class
  class SmartDollar {
    constructor(value) {
      // If createSmartDollar is available and we're not already in it, use it
      if (createSmartDollar && !this.__bypassProxy) {
        return createSmartDollar(value);
      }
      
      this._value = value;
      this.__isSmartDollar = true;
    }
    
    get length() {
      if (Array.isArray(this._value)) {
        return this._value.length;
      }
      if (typeof this._value === 'string') {
        return this._value.length;
      }
      if (this._value && typeof this._value === 'object') {
        return Object.keys(this._value).length;
      }
      return 0;
    }
    
    valueOf() {
      return this._value;
    }
    
    toString() {
      if (this._value === null) return '';
      if (this._value === undefined) return '';
      if (typeof this._value === 'string') return this._value;
      return JSON.stringify(this._value);
    }
    
    toJSON() {
      return this._value;
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
  }
  
  
  // Add static method to create instances (will be defined after createSmartDollar)
  SmartDollar.createInstance = null;
  
  // Apply all shared methods to SmartDollar prototype
  // smartDollarMethods should be defined by SMART_DOLLAR_METHODS above
  if (typeof globalThis.smartDollarMethods !== 'undefined') {
    Object.keys(globalThis.smartDollarMethods).forEach(method => {
      SmartDollar.prototype[method] = globalThis.smartDollarMethods[method];
    });
  }
  
  // Create $ function with Proxy wrapper
  createSmartDollar = function(data) {
    if (data === null || data === undefined) {
      return data;
    }
    
    // Create raw instance without proxy
    const smartDollar = Object.create(SmartDollar.prototype);
    smartDollar._value = data;
    smartDollar.__isSmartDollar = true;
    
    // Create proxy to handle property access
    return new Proxy(smartDollar, {
      get(target, prop, receiver) {
        // Special properties that should always come from SmartDollar
        const smartDollarOnlyProps = ['_value', '__isSmartDollar', 'constructor', 'length', Symbol.iterator, Symbol.toPrimitive];
        
        // Check SmartDollar-only properties FIRST
        if (smartDollarOnlyProps.includes(prop)) {
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
            const item = target._value[index];
            return item !== null && item !== undefined && typeof item === 'object'
              ? createSmartDollar(item)
              : item;
          }
        }
        
        // Check wrapped value properties FIRST for non-method properties
        // This ensures properties like 'value' on the data object are accessible
        if (target._value !== null && target._value !== undefined && typeof target._value === 'object' && prop in target._value) {
          const valueFromData = target._value[prop];
          
          // If it's a method on SmartDollar AND a property on the data,
          // prioritize SmartDollar methods ONLY for array/collection methods
          const smartDollarMethod = target[prop];
          const isArrayMethod = ['filter', 'map', 'reduce', 'find', 'some', 'every', 'forEach', 
                                'pluck', 'where', 'sortBy', 'groupBy', 'countBy', 'take', 'skip',
                                'uniqBy', 'flatten', 'compact', 'chunk', 'orderBy', 'keyBy',
                                'takeWhile', 'dropWhile', 'flattenDeep', 'reverse', 'sum',
                                'mean', 'min', 'max', 'minBy', 'maxBy', 'sample', 'sampleSize',
                                'size', 'isEmpty', 'includes', 'flatMap'].includes(prop);
          
          if (smartDollarMethod && typeof smartDollarMethod === 'function' && isArrayMethod) {
            return smartDollarMethod.bind(target);
          }
          
          // Otherwise, return the data property
          if (valueFromData !== undefined) {
            return valueFromData !== null && typeof valueFromData === 'object'
              ? createSmartDollar(valueFromData)
              : valueFromData;
          }
        }
        
        // Then check if property exists on SmartDollar instance (methods)
        if (prop in target) {
          const value = target[prop];
          if (typeof value === 'function') {
            return value.bind(target);
          }
          return value;
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
        if (target._value !== null && target._value !== undefined) {
          return prop in target._value;
        }
        return false;
      },
      
      ownKeys(target) {
        // Return keys from the wrapped value, not SmartDollar's properties
        if (target._value !== null && target._value !== undefined && typeof target._value === 'object') {
          return Reflect.ownKeys(target._value);
        }
        return [];
      },
      
      getOwnPropertyDescriptor(target, prop) {
        // Return descriptor from the wrapped value for Object.keys() to work
        if (target._value !== null && target._value !== undefined && typeof target._value === 'object' && prop in target._value) {
          return Object.getOwnPropertyDescriptor(target._value, prop);
        }
        return undefined;
      }
    });
  };
  
  // Now that createSmartDollar is defined, set the static method
  SmartDollar.createInstance = createSmartDollar;
  
  // Return the creator function and class
  return { createSmartDollar, SmartDollar };
})();
`;
}
