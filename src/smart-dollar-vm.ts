import { SMART_DOLLAR_METHODS, VM_SMART_DOLLAR_CLASS } from './smart-dollar-shared-methods';

export function createVMSmartDollarCode(): string {
  return `
${SMART_DOLLAR_METHODS}

${VM_SMART_DOLLAR_CLASS}

// Create $ function first before using it in the setup
globalThis.createSmartDollar = $;

// Only set up $ if it hasn't been set already (e.g., when data was null/undefined)
if (typeof globalThis.$ === 'undefined') {
  if (Array.isArray(globalThis.data)) {
    // Create a SmartDollar instance for the array
    const smartDollar = $(globalThis.data);
    
    // Create a proxy that intercepts property access
    const arrayProxy = new Proxy(smartDollar, {
      get(target, prop) {
        // For critical array properties, check the wrapped value
        if (prop === 'length') {
          return target._value.length;
        }
        
        // Check if it's a numeric index
        if (typeof prop === 'string' && /^\d+$/.test(prop)) {
          const index = parseInt(prop, 10);
          const item = target._value[index];
          return item !== undefined ? $(item) : undefined;
        }
        
        // List of methods that should use SmartDollar implementation
        const smartDollarMethods = ['map', 'filter', 'find', 'some', 'every', 'reduce', 
          'slice', 'concat', 'includes', 'indexOf', 'lastIndexOf', 'findIndex', 
          'join', 'reverse', 'sort', 'flatMap', 'flatten', 'flattenDeep', 'sortBy', 
          'groupBy', 'pluck', 'where', 'uniqBy', 'chunk', 'compact'];
        
        // For SmartDollar methods, use the SmartDollar implementation
        if (typeof prop === 'string' && smartDollarMethods.includes(prop)) {
          const value = target[prop];
          if (typeof value === 'function') {
            return value.bind(target);
          }
          return value;
        }
        
        // For other properties, check SmartDollar first, then the array
        if (prop in target) {
          const value = target[prop];
          if (typeof value === 'function') {
            return value.bind(target);
          }
          return value;
        }
        
        // Then check array properties
        if (prop in target._value) {
          const value = target._value[prop];
          if (typeof value === 'function') {
            return value.bind(target._value);
          }
          return value;
        }
        
        return undefined;
      },
      
      // Make Array.isArray() return true
      has(target, prop) {
        return prop in target || prop in target._value;
      },
      
      // Support iteration
      ownKeys(target) {
        return Reflect.ownKeys(target._value);
      },
      
      getOwnPropertyDescriptor(target, prop) {
        if (typeof prop === 'string' && /^\d+$/.test(prop)) {
          return Object.getOwnPropertyDescriptor(target._value, prop);
        }
        return undefined;
      }
    });
    
    // Make $ callable as a function too
    globalThis.$ = new Proxy(arrayProxy, {
      apply(target, thisArg, args) {
        if (args.length === 0) {
          return target;
        }
        return $(args[0]);
      },
      get(target, prop) {
        return target[prop];
      },
      has(target, prop) {
        return prop in target;
      },
      ownKeys(target) {
        return Reflect.ownKeys(target);
      },
      getOwnPropertyDescriptor(target, prop) {
        return Object.getOwnPropertyDescriptor(target, prop);
      }
    });
  } else if (globalThis.data !== null && globalThis.data !== undefined) {
    // For non-array data, create a SmartDollar and then add direct property access
    const smartDollar = $(globalThis.data);
    
    // Create a proxy that handles both SmartDollar methods and direct property access
    const $proxy = new Proxy(smartDollar, {
      get(target, prop) {
        // Handle length property specifically
        if (prop === 'length') {
          return target.length;
        }
        
        // Check if it's a number (array index)
        if (typeof prop === 'string' && /^\d+$/.test(prop)) {
          const index = parseInt(prop, 10);
          if (Array.isArray(target._value)) {
            const item = target._value[index];
            return item !== undefined ? $(item) : undefined;
          }
        }
        
        // PRIORITIZE: Property access on the wrapped value BEFORE SmartDollar methods
        if (target._value && typeof target._value === 'object' && prop in target._value) {
          const propValue = target._value[prop];
          if (typeof propValue === 'function') {
            return propValue.bind(target._value);
          }
          // For primitive values, return them directly so comparisons work
          if (propValue === null || propValue === undefined || 
              typeof propValue === 'string' || typeof propValue === 'number' || 
              typeof propValue === 'boolean') {
            return propValue;
          }
          // For objects/arrays, wrap in SmartDollar
          return $(propValue);
        }
        
        // Then check if it's a SmartDollar method or property
        if (prop in target) {
          const value = target[prop];
          if (typeof value === 'function') {
            return value.bind(target);
          }
          return value;
        }
        
        return undefined;
      },
      
      // Implement has trap for 'in' operator
      has(target, prop) {
        // Check wrapped value properties first
        if (target._value && typeof target._value === 'object' && prop in target._value) {
          return true;
        }
        // Then check SmartDollar properties
        if (prop in target) {
          return true;
        }
        return false;
      },
      
      // Make $ callable as a function
      apply(target, thisArg, args) {
        if (args.length === 0) {
          return target._value;
        }
        return $(args[0]);
      },
      
      // Handle Object.keys() and Object.values()
      ownKeys(target) {
        if (target._value && typeof target._value === 'object') {
          // Return only the keys from the wrapped value, not SmartDollar's own properties
          return Reflect.ownKeys(target._value);
        }
        return [];
      },
      
      getOwnPropertyDescriptor(target, prop) {
        // First check if it's a property of the wrapped value
        if (target._value && typeof target._value === 'object' && prop in target._value) {
          return Object.getOwnPropertyDescriptor(target._value, prop);
        }
        // Don't expose SmartDollar's internal properties through Object.keys
        return undefined;
      }
    });
    
    globalThis.$ = $proxy;
  }
}
`;
}

export function getVMInitCode(): string {
  return createVMSmartDollarCode();
}