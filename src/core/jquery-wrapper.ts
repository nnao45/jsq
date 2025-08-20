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

export function createSmartDollar(data: unknown) {
  // Create a function that acts as both constructor and data container
  const $ = ((...args: unknown[]) => {
    if (args.length === 0) {
      // No arguments: return the root data as chainable
      return new ChainableWrapper(data);
    } else {
      // With arguments: act as constructor
      return new ChainableWrapper(args[0]);
    }
  }) as Record<string, unknown> & ((...args: unknown[]) => ChainableWrapper);

  // Create a simpler wrapper that just acts as the data accessor
  // This avoids complex property assignment that doesn't work well in VM
  const wrapper = new ChainableWrapper(data);

  // Create a proxy that combines function behavior with property access
  return new Proxy($, {
    get(target, prop, _receiver) {
      return getProxyProperty(target, prop, data, wrapper);
    },

    apply(target, thisArg, argumentsList) {
      return target.apply(thisArg, argumentsList);
    },
  });
}

function getProxyProperty(
  target: unknown,
  prop: string | symbol,
  data: unknown,
  wrapper: ChainableWrapper
): unknown {
  // Handle special symbols
  const symbolResult = handleSymbols(prop, data);
  if (symbolResult !== undefined) {
    return symbolResult;
  }

  // Handle toString method
  if (prop === 'toString') {
    return createToStringHandler(data);
  }

  // Handle function delegation
  const targetObj = target as Record<string | symbol, unknown>;
  if (typeof targetObj[prop] === 'function') {
    return (targetObj[prop] as (...args: unknown[]) => unknown).bind(target);
  }

  // Handle object property access
  const objectResult = handleObjectProperty(prop, data);
  if (objectResult !== undefined) {
    return objectResult;
  }

  // Handle array delegation
  const arrayResult = handleArrayProperty(prop, data, wrapper);
  if (arrayResult !== undefined) {
    return arrayResult;
  }

  return undefined;
}

function handleSymbols(prop: string | symbol, data: unknown): (() => unknown) | undefined {
  if (prop === Symbol.toPrimitive || prop === 'valueOf') {
    return () => data;
  }
  return undefined;
}

function createToStringHandler(data: unknown): () => string {
  return () => {
    if (data === undefined) return 'undefined';
    if (data === null) return 'null';
    if (typeof data === 'string') return data;
    if (typeof data === 'number' || typeof data === 'boolean') return String(data);
    return JSON.stringify(data);
  };
}

function handleObjectProperty(prop: string | symbol, data: unknown): ChainableWrapper | undefined {
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    if (typeof prop === 'string' && prop in obj) {
      return new ChainableWrapper(obj[prop]);
    }
  }
  return undefined;
}

function handleArrayProperty(
  prop: string | symbol,
  data: unknown,
  wrapper: ChainableWrapper
): unknown {
  if (Array.isArray(data) && typeof prop === 'string' && prop in wrapper) {
    const wrapperObj = wrapper as Record<string, unknown>;
    const value = wrapperObj[prop];
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(wrapper);
    }
    return value;
  }
  return undefined;
}
