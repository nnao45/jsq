import { ChainableWrapper } from '../chainable/chainable';
import { CHAINABLE_METHODS } from '../chainable/chainable-methods';

// Native array methods available for potential future array method delegation
// Currently unused but kept for reference and future development

export function createSmartDollar(data: unknown) {
  // If data is null or undefined, return a minimal wrapper
  if (data === null || data === undefined) {
    const $ = (...args: unknown[]) => {
      if (args.length === 0) {
        return data;
      }
      return new ChainableWrapper(args[0]);
    };
    Object.defineProperty($, 'valueOf', { value: () => data });
    Object.defineProperty($, 'toString', { value: () => String(data) });
    Object.defineProperty($, 'toJSON', { value: () => data });

    // Add Symbol.toPrimitive for proper type coercion in conditionals
    Object.defineProperty($, Symbol.toPrimitive, {
      value: (hint: string) => {
        if (hint === 'default' || hint === 'string') {
          return data;
        }
        if (hint === 'number') {
          return typeof data === 'number' ? data : Number(data);
        }
        return data;
      },
    });

    // For exact '$' expressions, the evaluator should return the raw data directly
    // This is handled by checking if the expression is exactly '$' in the expression transformer
    return $;
  }

  // For arrays, return actual array with added methods
  if (Array.isArray(data)) {
    // Create an actual array - this will pass Array.isArray()
    const $ = [...data] as unknown[] & Record<string, unknown>;

    // Add .data property to access raw data (for tests)
    Object.defineProperty($, 'data', {
      value: data,
      enumerable: false,
      configurable: true,
      writable: false,
    });

    // Add .value property for consistency with ChainableWrapper
    Object.defineProperty($, 'value', {
      value: data,
      enumerable: false,
      configurable: true,
      writable: false,
    });

    // Ensure constructor property is correctly set to Array
    Object.defineProperty($, 'constructor', {
      value: Array,
      enumerable: false,
      configurable: true,
      writable: true,
    });

    // Attach chainable methods directly to the array
    attachChainableMethods($, data);

    // Add special chain() method for explicit function-like behavior
    Object.defineProperty($, 'chain', {
      value: () => new ChainableWrapper(data),
      enumerable: false,
      configurable: true,
      writable: false,
    });

    // Override special methods for JSON compatibility
    Object.defineProperty($, 'toJSON', {
      value: () => data,
      enumerable: false,
      configurable: true,
    });

    Object.defineProperty($, 'valueOf', {
      value: () => data,
      enumerable: false,
      configurable: true,
    });

    Object.defineProperty($, 'toString', {
      value: () => JSON.stringify(data),
      enumerable: false,
      configurable: true,
    });

    return $; // This is a real array, so Array.isArray($) === true
  }

  // Create the $ function for objects
  const $ = (...args: unknown[]) => {
    if (args.length === 0) {
      // Return a chainable wrapper when called
      return new ChainableWrapper(data);
    } else {
      // Create new chainable wrapper with argument
      return new ChainableWrapper(args[0]);
    }
  };

  // For objects, add properties with dual accessor pattern
  if (typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;

    // First, add all raw properties for Object.keys/values/entries compatibility
    for (const [key, value] of Object.entries(obj)) {
      if (!CHAINABLE_METHODS.includes(key)) {
        // Add raw property for native operations
        Object.defineProperty($, key, {
          value: value,
          enumerable: true,
          configurable: true,
          writable: false,
        });
      }
    }

    // Create a proxy to handle chainable property access
    return new Proxy($, {
      get(target, prop, receiver) {
        // Handle special built-in methods FIRST before checking data properties
        if (prop === 'hasOwnProperty') {
          return (propName: string) => Object.hasOwn(obj, propName);
        }
        if (prop === 'propertyIsEnumerable') {
          return (propName: string) => Object.prototype.propertyIsEnumerable.call(obj, propName);
        }
        if (prop === 'toJSON') {
          return () => obj;
        }
        if (prop === 'valueOf') {
          return () => obj;
        }
        if (prop === 'toString') {
          return () => JSON.stringify(obj);
        }

        // For data properties, check if user wants chainable or raw access
        if (typeof prop === 'string' && Object.hasOwn(obj, prop)) {
          // If this is a method call (like .sum() on array property), return ChainableWrapper
          const value = obj[prop];

          // For conflicting names with chainable methods, prefer data property
          if (CHAINABLE_METHODS.includes(prop)) {
            return new ChainableWrapper(value);
          }

          // For regular property access in expressions like $.prop, return ChainableWrapper
          // But for Object.values/keys/entries, this won't be called due to getOwnPropertyDescriptor
          return new ChainableWrapper(value);
        }

        // Handle function properties and methods normally
        const targetProp = Reflect.get(target, prop, receiver);
        if (targetProp !== undefined) {
          return targetProp;
        }

        return undefined;
      },

      getOwnPropertyDescriptor(target, prop) {
        // For Object.values/entries/keys, return the descriptor with raw value
        if (typeof prop === 'string' && prop in obj) {
          return {
            configurable: true,
            enumerable: true,
            value: obj[prop], // Raw value for native operations
            writable: false,
          };
        }
        return Reflect.getOwnPropertyDescriptor(target, prop);
      },

      has(target, prop) {
        return prop in obj || Reflect.has(target, prop);
      },

      ownKeys() {
        return Object.keys(obj);
      },
    });
  }

  // Add special handlers for non-object types (objects are handled by Proxy)
  Object.defineProperty($, 'hasOwnProperty', {
    value: Object.prototype.hasOwnProperty,
    enumerable: false,
    configurable: true,
  });

  Object.defineProperty($, 'propertyIsEnumerable', {
    value: Object.prototype.propertyIsEnumerable,
    enumerable: false,
    configurable: true,
  });

  // Attach chainable methods
  attachChainableMethods($ as unknown as Record<string, unknown>, data);

  // Add other special handlers
  Object.defineProperty($, 'toJSON', {
    value: () => data,
    enumerable: false,
    configurable: true,
  });

  Object.defineProperty($, 'valueOf', {
    value: () => data,
    enumerable: false,
    configurable: true,
  });

  Object.defineProperty($, 'toString', {
    value: () => {
      if (typeof data === 'string') return data;
      if (typeof data === 'number' || typeof data === 'boolean') return String(data);
      return JSON.stringify(data);
    },
    enumerable: false,
    configurable: true,
  });

  // Make Object.keys/values/entries work correctly
  Object.defineProperty($, Symbol.for('nodejs.util.inspect.custom'), {
    value: () => data,
    enumerable: false,
    configurable: true,
  });

  return $;
}

function attachChainableMethods(target: Record<string, unknown>, originalData: unknown): void {
  // Create a ChainableWrapper instance for method delegation
  const wrapper = new ChainableWrapper(originalData);

  // Attach each chainable method
  for (const methodName of CHAINABLE_METHODS) {
    if (
      methodName in wrapper &&
      typeof (wrapper as unknown as Record<string, unknown>)[methodName] === 'function'
    ) {
      // For objects, check if property already exists (data property takes precedence)
      if (
        typeof originalData === 'object' &&
        !Array.isArray(originalData) &&
        originalData !== null &&
        methodName in (originalData as Record<string, unknown>)
      ) {
        // Skip attaching chainable method if data property exists with same name
        continue;
      }

      Object.defineProperty(target, methodName, {
        value: (...args: unknown[]) => {
          const method = (wrapper as unknown as Record<string, unknown>)[methodName];
          if (typeof method !== 'function') {
            throw new Error(`${methodName} is not a function`);
          }
          const result = method(...args);

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
        writable: false,
      });
    }
  }

  // Add chain method to explicitly start chaining
  Object.defineProperty(target, 'chain', {
    value: () => new ChainableWrapper(originalData),
    enumerable: false,
    configurable: true,
    writable: false,
  });
}
