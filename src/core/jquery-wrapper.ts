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
        (baseWrapper as any)[key] = new ChainableWrapper(value);
      } else {
        (baseWrapper as any)[key] = value;
      }
    }
  }
  
  return baseWrapper as ChainableWrapper & Record<string, unknown>;
}

export function createSmartDollar(data: unknown) {
  // Create a function that acts as both constructor and data container
  const $ = function(input?: unknown) {
    if (arguments.length === 0) {
      // No arguments: return the root data as chainable
      return new ChainableWrapper(data);
    } else {
      // With arguments: act as constructor
      return new ChainableWrapper(input);
    }
  } as any;

  // Create a simpler wrapper that just acts as the data accessor
  // This avoids complex property assignment that doesn't work well in VM
  const wrapper = new ChainableWrapper(data);
  
  // Create a proxy that combines function behavior with property access
  return new Proxy($, {
    get(target, prop, receiver) {
      // Handle function calls
      if (prop === Symbol.toPrimitive || prop === 'valueOf') {
        return () => data;
      }
      if (prop === 'toString') {
        return () => JSON.stringify(data);
      }
      
      // If it's a method call, delegate to function
      if (typeof target[prop] === 'function') {
        return target[prop].bind(target);
      }
      
      // For property access, delegate to the wrapper
      if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        const obj = data as Record<string, unknown>;
        if (typeof prop === 'string' && prop in obj) {
          return new ChainableWrapper(obj[prop]);
        }
      }
      
      // For arrays, delegate to wrapper methods
      if (Array.isArray(data) && typeof prop === 'string' && prop in wrapper) {
        const value = (wrapper as any)[prop];
        if (typeof value === 'function') {
          return value.bind(wrapper);
        }
        return value;
      }
      
      return undefined;
    },
    
    apply(target, thisArg, argumentsList) {
      return target.apply(thisArg, argumentsList);
    }
  });
}