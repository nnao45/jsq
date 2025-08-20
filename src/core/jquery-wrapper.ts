import { ChainableWrapper } from './chainable';

export function createJQueryLikeWrapper(data: unknown): ChainableWrapper & Record<string, unknown> {
  // Create the base chainable wrapper
  const baseWrapper = new ChainableWrapper(data) as ChainableWrapper;

  // If data is an object, add its properties directly to the wrapper
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    for (const [key, value] of Object.entries(obj)) {
      // Create chainable wrappers for each property
      if (typeof value === 'object' && value !== null) {
        (baseWrapper as Record<string, unknown>)[key] = new ChainableWrapper(value);
      } else {
        (baseWrapper as Record<string, unknown>)[key] = value;
      }
    }
  }

  return baseWrapper as ChainableWrapper & Record<string, unknown>;
}

// List of ChainableWrapper methods that should trigger chainable behavior
const CHAINABLE_METHODS = [
  'map', 'filter', 'find', 'reduce', 'groupBy', 'sortBy', 'slice',
  'flatten', 'uniq', 'compact', 'pluck', 'where', 'findWhere',
  'first', 'last', 'take', 'drop', 'sample', 'shuffle',
  'keys', 'values', 'entries', 'pick', 'omit', 'defaults',
  'merge', 'extend', 'clone', 'has', 'get', 'set',
  'sum', 'mean', 'min', 'max', 'count', 'size',
  'isEmpty', 'isArray', 'isObject', 'isString', 'isNumber',
  'toArray'
];

// Native array methods that should be available on array $
const NATIVE_ARRAY_METHODS = [
  'forEach', 'some', 'every', 'indexOf', 'lastIndexOf',
  'includes', 'join', 'reverse', 'sort', 'push', 'pop',
  'shift', 'unshift', 'splice', 'concat', 'fill',
  'find', 'findIndex', 'flat', 'flatMap', 'reduce', 'reduceRight'
];

export function createSmartDollar(data: unknown) {
  // If data is null or undefined, return a minimal wrapper
  if (data === null || data === undefined) {
    const $ = function(...args: unknown[]) {
      if (args.length === 0) {
        return data;
      }
      return new ChainableWrapper(args[0]);
    };
    Object.defineProperty($, 'valueOf', { value: () => data });
    Object.defineProperty($, 'toString', { value: () => String(data) });
    Object.defineProperty($, 'toJSON', { value: () => data });
    return $;
  }
  
  // For arrays, return actual array with added methods
  if (Array.isArray(data)) {
    // Create an actual array - this will pass Array.isArray()
    const $ = [...data] as any;
    
    // Add .data property to access raw data (for tests)
    Object.defineProperty($, 'data', {
      value: data,
      enumerable: false,
      configurable: true,
      writable: false
    });
    
    // Add .value property for consistency with ChainableWrapper
    Object.defineProperty($, 'value', {
      value: data,
      enumerable: false,
      configurable: true,
      writable: false
    });
    
    // Attach chainable methods directly to the array
    attachChainableMethods($, data);
    
    // Add special chain() method for explicit function-like behavior
    Object.defineProperty($, 'chain', {
      value: function() {
        return new ChainableWrapper(data);
      },
      enumerable: false,
      configurable: true,
      writable: false
    });
    
    // Add call() method as alternative to $()
    Object.defineProperty($, 'call', {
      value: function(...args: unknown[]) {
        if (args.length === 0) {
          return new ChainableWrapper(data);
        }
        return new ChainableWrapper(args[0]);
      },
      enumerable: false,
      configurable: true,
      writable: false
    });
    
    // Override special methods for JSON compatibility
    Object.defineProperty($, 'toJSON', {
      value: () => data,
      enumerable: false,
      configurable: true
    });
    
    Object.defineProperty($, 'valueOf', {
      value: () => data,
      enumerable: false,
      configurable: true
    });
    
    Object.defineProperty($, 'toString', {
      value: () => JSON.stringify(data),
      enumerable: false,
      configurable: true
    });
    
    return $; // This is a real array, so Array.isArray($) === true
  }
  
  // Create the $ function for objects
  const $ = function(...args: unknown[]) {
    if (args.length === 0) {
      // Return a chainable wrapper when called
      return new ChainableWrapper(data);
    } else {
      // Create new chainable wrapper with argument
      return new ChainableWrapper(args[0]);
    }
  };
  
  // For objects, add properties as ChainableWrappers with Proxy for conflicts
  if (typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    
    // Add all properties first
    for (const [key, value] of Object.entries(obj)) {
      Object.defineProperty($, key, {
        value: new ChainableWrapper(value),
        enumerable: true,
        configurable: true,
        writable: true // Allow overwriting by chainable methods
      });
    }
    
    // Add a special accessor for conflicting property names
    Object.defineProperty($, 'prop', {
      value: function(propertyName: string) {
        return new ChainableWrapper(obj[propertyName]);
      },
      enumerable: false,
      configurable: true,
      writable: false
    });
  }
  
  // Attach chainable methods
  attachChainableMethods($, data);
  
  // Add special handlers
  Object.defineProperty($, 'toJSON', {
    value: () => data,
    enumerable: false,
    configurable: true
  });
  
  Object.defineProperty($, 'valueOf', {
    value: () => data,
    enumerable: false,
    configurable: true
  });
  
  Object.defineProperty($, 'toString', {
    value: () => {
      if (typeof data === 'string') return data;
      if (typeof data === 'number' || typeof data === 'boolean') return String(data);
      return JSON.stringify(data);
    },
    enumerable: false,
    configurable: true
  });
  
  // Make Object.keys/values/entries work correctly
  Object.defineProperty($, Symbol.for('nodejs.util.inspect.custom'), {
    value: () => data,
    enumerable: false,
    configurable: true
  });
  
  return $;
}

function attachChainableMethods(target: any, originalData: unknown): void {
  // Create a ChainableWrapper instance for method delegation
  const wrapper = new ChainableWrapper(originalData);
  
  // Attach each chainable method
  for (const methodName of CHAINABLE_METHODS) {
    if (methodName in wrapper && typeof (wrapper as any)[methodName] === 'function') {
      // For objects, check if property already exists (data property takes precedence)
      if (typeof originalData === 'object' && !Array.isArray(originalData) && 
          originalData !== null && methodName in (originalData as Record<string, unknown>)) {
        // Skip attaching chainable method if data property exists with same name
        continue;
      }
      
      Object.defineProperty(target, methodName, {
        value: function(...args: unknown[]) {
          const result = (wrapper as any)[methodName](...args);
          
          // For arrays, return ChainableWrapper as-is for chaining
          if (Array.isArray(originalData)) {
            return result;
          }
          
          // For objects, unwrap if needed
          if (result && typeof result === 'object' && 'value' in result) {
            const unwrappedValue = result.value;
            
            // If the unwrapped value is an array, return it as a smart array
            if (Array.isArray(unwrappedValue)) {
              return createSmartDollar(unwrappedValue);
            }
            
            return unwrappedValue;
          }
          
          return result;
        },
        enumerable: false,
        configurable: true,
        writable: false
      });
    }
  }
  
  // Add chain method to explicitly start chaining
  Object.defineProperty(target, 'chain', {
    value: function() {
      return new ChainableWrapper(originalData);
    },
    enumerable: false,
    configurable: true,
    writable: false
  });
}