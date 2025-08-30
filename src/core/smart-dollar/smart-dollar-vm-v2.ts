import { SMART_DOLLAR_METHODS } from './smart-dollar-shared-methods';

// グローバル変数を使わないSmartDollar実装
export function createVMSmartDollarCodeV2(): string {
  return `
// SmartDollar implementation without global variables
(function() {
  ${SMART_DOLLAR_METHODS}
  
  // Define SmartDollar class
  class SmartDollar {
    constructor(value) {
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
  
  // Apply all shared methods to SmartDollar prototype
  // smartDollarMethods should be defined by SMART_DOLLAR_METHODS above
  if (typeof globalThis.smartDollarMethods !== 'undefined') {
    Object.keys(globalThis.smartDollarMethods).forEach(method => {
      SmartDollar.prototype[method] = globalThis.smartDollarMethods[method];
    });
  }
  
  // Create $ function with Proxy wrapper
  const createSmartDollar = function(data) {
    if (data === null || data === undefined) {
      return data;
    }
    const smartDollar = new SmartDollar(data);
    
    // Create proxy to handle property access
    return new Proxy(smartDollar, {
      get(target, prop, receiver) {
        // Special properties that should always come from SmartDollar
        const smartDollarOnlyProps = ['_value', '__isSmartDollar', 'constructor', 'length', Symbol.iterator, Symbol.toPrimitive];
        
        // Handle numeric indices for arrays first
        if (typeof prop === 'string' && !isNaN(Number(prop))) {
          const index = Number(prop);
          if (Array.isArray(target._value) && index >= 0 && index < target._value.length) {
            const item = target._value[index];
            return item !== null && item !== undefined && typeof item === 'object'
              ? createSmartDollar(item)
              : item;
          }
        }
        
        // Check wrapped value properties before SmartDollar methods
        // This ensures properties like 'values' on the data object take precedence
        if (target._value !== null && target._value !== undefined && typeof target._value === 'object' && prop in target._value) {
          const value = target._value[prop];
          if (value !== undefined) {
            return value !== null && typeof value === 'object'
              ? createSmartDollar(value)
              : value;
          }
        }
        
        // Check if property exists on SmartDollar instance
        if (prop in target || smartDollarOnlyProps.includes(prop)) {
          const value = target[prop];
          if (typeof value === 'function') {
            return value.bind(target);
          }
          return value;
        }
        
        return undefined;
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
  
  // Return the creator function and class
  return { createSmartDollar, SmartDollar };
})();
`;
}
