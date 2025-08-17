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

  // Add data properties directly to the $ function
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    for (const [key, value] of Object.entries(obj)) {
      // Create chainable wrappers for each property
      $[key] = new ChainableWrapper(value);
    }
  } else if (Array.isArray(data)) {
    // For arrays, make the function itself act like the array
    Object.setPrototypeOf($, ChainableWrapper.prototype);
    ($ as any).data = data;
    
    // Add array methods
    const wrapper = new ChainableWrapper(data);
    $.__proto__ = wrapper.__proto__;
    ($ as any).data = data;
  }

  // Add valueOf method to unwrap when used in expressions
  $.valueOf = () => data;
  $.toString = () => JSON.stringify(data);
  
  return $;
}