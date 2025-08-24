// New createSmartDollar implementation that avoids closure issues
const createSmartDollarCode = `
// Define async methods inside VM context
globalThis.asyncMethods = {
  mapAsync: async function(array, fn) {
    return Promise.all(array.map((item, index) => fn(item, index, array)));
  },
  mapAsyncSeq: async function(array, fn) {
    const results = [];
    for (let i = 0; i < array.length; i++) {
      results.push(await fn(array[i], i, array));
    }
    return results;
  },
  forEachAsync: async function(array, fn) {
    await Promise.all(array.map((item, index) => fn(item, index, array)));
  },
  forEachAsyncSeq: async function(array, fn) {
    for (let i = 0; i < array.length; i++) {
      await fn(array[i], i, array);
    }
  }
};
globalThis.createSmartDollar = function(data) {
  // Special handling for null/undefined
  if (data === null || data === undefined) {
    return data;
  }
  
  // Check if data already has smart methods to avoid re-wrapping
  if (data && data._isSmartDollar) {
    return data;
  }
  
  // Prevent infinite recursion - track objects being processed
  if (!globalThis._smartDollarProcessing) {
    globalThis._smartDollarProcessing = new WeakSet();
  }
  
  // Check if this object is already being processed
  if (typeof data === 'object' && data !== null) {
    if (globalThis._smartDollarProcessing.has(data)) {
      return data; // Return as-is to prevent recursion
    }
    globalThis._smartDollarProcessing.add(data);
  }
  
  // For arrays, attach methods directly to avoid proxy issues with isolated-vm
  if (Array.isArray(data)) {
    // Create method implementations that reference globalThis to avoid closures
    const arrayMethods = {
      // Native array methods that return new arrays
      filter: function(target, ...args) {
        const filtered = Array.prototype.filter.apply(target, args);
        return globalThis.createSmartDollar(filtered);
      },
      map: function(target, ...args) {
        // console.log('[DEBUG] Custom map called!');
        const mapped = Array.prototype.map.apply(target, args);
        // Always ensure we return a smart dollar
        const result = globalThis.createSmartDollar(mapped);
        // console.log('[DEBUG] Map result has orderBy?', typeof result.orderBy);
        return result;
      },
      slice: function(target, ...args) {
        const sliced = Array.prototype.slice.apply(target, args);
        return globalThis.createSmartDollar(sliced);
      },
      concat: function(target, ...args) {
        const concatenated = Array.prototype.concat.apply(target, args);
        return globalThis.createSmartDollar(concatenated);
      },
      find: function(target, ...args) {
        const found = Array.prototype.find.apply(target, args);
        // find returns a single element, not an array, so don't wrap it
        return found;
      },
      
      // Custom methods
      chunk: function(target, size) {
        const chunks = [];
        for (let i = 0; i < target.length; i += size) {
          chunks.push(target.slice(i, i + size));
        }
        return globalThis.createSmartDollar(chunks);
      },
      pluck: function(target, key) {
        return globalThis.createSmartDollar(target.map(item => item && item[key]));
      },
      where: function(target, key, value) {
        return globalThis.createSmartDollar(target.filter(item => item && item[key] === value));
      },
      sortBy: function(target, key) {
        return globalThis.createSmartDollar([...target].sort((a, b) => {
          const aVal = a && a[key];
          const bVal = b && b[key];
          if (aVal < bVal) return -1;
          if (aVal > bVal) return 1;
          return 0;
        }));
      },
      take: function(target, n) {
        return globalThis.createSmartDollar(target.slice(0, n));
      },
      skip: function(target, n) {
        return globalThis.createSmartDollar(target.slice(n));
      },
      flatMap: function(target, fn) {
        const result = [];
        for (let i = 0; i < target.length; i++) {
          const mapped = fn(target[i], i, target);
          if (Array.isArray(mapped)) {
            result.push(...mapped);
          } else {
            result.push(mapped);
          }
        }
        return globalThis.createSmartDollar(result);
      },
      takeWhile: function(target, predicate) {
        const result = [];
        for (let i = 0; i < target.length; i++) {
          if (!predicate(target[i], i, target)) break;
          result.push(target[i]);
        }
        return globalThis.createSmartDollar(result);
      },
      dropWhile: function(target, predicate) {
        let i = 0;
        while (i < target.length && predicate(target[i], i, target)) i++;
        return globalThis.createSmartDollar(target.slice(i));
      },
      reverse: function(target) {
        return globalThis.createSmartDollar([...target].reverse());
      },
      uniqBy: function(target, iteratee) {
        const seen = new Set();
        const result = [];
        for (const item of target) {
          const key = typeof iteratee === 'function' ? iteratee(item) : item[iteratee];
          if (!seen.has(key)) {
            seen.add(key);
            result.push(item);
          }
        }
        return globalThis.createSmartDollar(result);
      },
      orderBy: function(target, keys, orders) {
        if (!Array.isArray(keys)) keys = [keys];
        if (!Array.isArray(orders)) orders = keys.map(() => 'asc');
        
        return globalThis.createSmartDollar([...target].sort((a, b) => {
          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const order = orders[i] || 'asc';
            const aVal = typeof key === 'function' ? key(a) : a[key];
            const bVal = typeof key === 'function' ? key(b) : b[key];
            
            if (aVal < bVal) return order === 'asc' ? -1 : 1;
            if (aVal > bVal) return order === 'asc' ? 1 : -1;
          }
          return 0;
        }));
      },
      sampleSize: function(target, n) {
        const shuffled = [...target];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return globalThis.createSmartDollar(shuffled.slice(0, Math.min(n, shuffled.length)));
      },
      groupBy: function(target, iteratee) {
        const result = {};
        for (const item of target) {
          const key = typeof iteratee === 'function' ? iteratee(item) : item[iteratee];
          if (!result[key]) result[key] = [];
          result[key].push(item);
        }
        // Return plain object instead of wrapped proxy to avoid cloning issues
        return result;
      },
      sortBy: function(target, iteratee) {
        return globalThis.createSmartDollar([...target].sort((a, b) => {
          const aVal = typeof iteratee === 'function' ? iteratee(a) : a[iteratee];
          const bVal = typeof iteratee === 'function' ? iteratee(b) : b[iteratee];
          if (aVal < bVal) return -1;
          if (aVal > bVal) return 1;
          return 0;
        }));
      },
      countBy: function(target, iteratee) {
        const result = {};
        for (const item of target) {
          const key = typeof iteratee === 'function' ? iteratee(item) : item[iteratee];
          result[key] = (result[key] || 0) + 1;
        }
        return result;
      },
      keyBy: function(target, iteratee) {
        const result = {};
        for (const item of target) {
          const key = typeof iteratee === 'function' ? iteratee(item) : item[iteratee];
          result[key] = item;
        }
        return result;
      },
      
      // Methods that return primitives
      includes: function(target, value) {
        return Array.prototype.includes.call(target, value);
      },
      minBy: function(target, iteratee) {
        if (target.length === 0) return undefined;
        return target.reduce((min, item) => {
          const minVal = typeof iteratee === 'function' ? iteratee(min) : min[iteratee];
          const itemVal = typeof iteratee === 'function' ? iteratee(item) : item[iteratee];
          return itemVal < minVal ? item : min;
        });
      },
      maxBy: function(target, iteratee) {
        if (target.length === 0) return undefined;
        return target.reduce((max, item) => {
          const maxVal = typeof iteratee === 'function' ? iteratee(max) : max[iteratee];
          const itemVal = typeof iteratee === 'function' ? iteratee(item) : item[iteratee];
          return itemVal > maxVal ? item : max;
        });
      },
      sum: function(target, key) {
        return target.reduce((sum, item) => {
          const value = key ? (item && item[key]) : item;
          return sum + (typeof value === 'number' ? value : 0);
        }, 0);
      },
      size: function(target) {
        return target.length;
      },
      isEmpty: function(target) {
        return target.length === 0;
      },
      
      // Async methods
      mapAsync: function(target, fn) {
        // Convert string to array of chars if needed
        const arrayTarget = typeof target === 'string' ? Array.from(target) : target;
        return globalThis.asyncMethods.mapAsync(arrayTarget, fn).then(results => 
          globalThis.createSmartDollar(results)
        );
      },
      mapAsyncSeq: function(target, fn) {
        return globalThis.asyncMethods.mapAsyncSeq(target, fn).then(results => 
          globalThis.createSmartDollar(results)
        );
      },
      forEachAsync: function(target, fn) {
        return globalThis.asyncMethods.forEachAsync(target, fn);
      },
      forEachAsyncSeq: function(target, fn) {
        return globalThis.asyncMethods.forEachAsyncSeq(target, fn);
      },
      
      // Chain method for lodash-style chaining
      chain: function(target) {
        let wrappedValue = target;
        const ChainableWrapper = {
          map: function(fn) {
            wrappedValue = Array.isArray(wrappedValue) ? wrappedValue.map(fn) : wrappedValue;
            return ChainableWrapper;
          },
          filter: function(fn) {
            wrappedValue = Array.isArray(wrappedValue) ? wrappedValue.filter(fn) : wrappedValue;
            return ChainableWrapper;
          },
          sortBy: function(keyFn) {
            if (Array.isArray(wrappedValue)) {
              wrappedValue = [...wrappedValue].sort((a, b) => {
                const aKey = typeof keyFn === 'function' ? keyFn(a) : a[keyFn];
                const bKey = typeof keyFn === 'function' ? keyFn(b) : b[keyFn];
                return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
              });
            }
            return ChainableWrapper;
          },
          groupBy: function(keyFn) {
            if (Array.isArray(wrappedValue)) {
              wrappedValue = wrappedValue.reduce((groups, item) => {
                const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
                if (!groups[key]) groups[key] = [];
                groups[key].push(item);
                return groups;
              }, {});
            }
            return ChainableWrapper;
          },
          take: function(n) {
            wrappedValue = Array.isArray(wrappedValue) ? wrappedValue.slice(0, n) : wrappedValue;
            return ChainableWrapper;
          },
          flatten: function() {
            wrappedValue = Array.isArray(wrappedValue) ? wrappedValue.flat() : wrappedValue;
            return ChainableWrapper;
          },
          uniq: function() {
            wrappedValue = Array.isArray(wrappedValue) ? [...new Set(wrappedValue)] : wrappedValue;
            return ChainableWrapper;
          },
          compact: function() {
            wrappedValue = Array.isArray(wrappedValue) ? wrappedValue.filter(Boolean) : wrappedValue;
            return ChainableWrapper;
          },
          value: wrappedValue
        };
        return ChainableWrapper;
      },
      
      // Additional array methods
      compact: function(target) {
        return globalThis.createSmartDollar(target.filter(Boolean));
      },
      flatten: function(target) {
        return globalThis.createSmartDollar(target.flat());
      },
      flattenDeep: function(target) {
        const flattenDeep = (arr) => {
          return arr.reduce((acc, val) => 
            Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
        };
        return globalThis.createSmartDollar(flattenDeep(target));
      },
      entries: function(target) {
        return globalThis.createSmartDollar(Object.entries(target));
      },
      keys: function(target) {
        return globalThis.createSmartDollar(Object.keys(target));
      },
      values: function(target) {
        return globalThis.createSmartDollar(Object.values(target));
      },
      
      // Other methods can be added here...
    };
    
    // Use the original array instead of creating a copy
    const smartArray = data;
    
    // Mark as smart dollar to avoid re-wrapping
    Object.defineProperty(smartArray, '_isSmartDollar', {
      value: true,
      enumerable: false,
      configurable: false
    });
    
    // Attach methods directly to avoid proxy issues
    for (const [methodName, methodImpl] of Object.entries(arrayMethods)) {
      Object.defineProperty(smartArray, methodName, {
        value: function(...args) {
          return methodImpl(smartArray, ...args);
        },
        enumerable: false,
        configurable: true
      });
    }
    
    // Clean up tracking before returning
    if (globalThis._smartDollarProcessing) {
      globalThis._smartDollarProcessing.delete(data);
    }
    return smartArray;
  }
  
  // Don't wrap built-in objects that shouldn't be proxied
  if (typeof data === 'object' && data !== null) {
    // Skip Date, RegExp, Error, and other built-in objects
    if (data instanceof Date || 
        data instanceof RegExp || 
        data instanceof Error ||
        data instanceof Promise ||
        data instanceof Map ||
        data instanceof Set ||
        data instanceof WeakMap ||
        data instanceof WeakSet ||
        data instanceof ArrayBuffer ||
        data instanceof DataView ||
        data.constructor && data.constructor.name && 
        (data.constructor.name.includes('Error') || 
         data.constructor.name.includes('Iterator'))) {
      // Clean up tracking before returning
      if (globalThis._smartDollarProcessing) {
        globalThis._smartDollarProcessing.delete(data);
      }
      return data;
    }
    
    // Clean up tracking set before creating proxy
    if (globalThis._smartDollarProcessing) {
      globalThis._smartDollarProcessing.delete(data);
    }
    
    return new Proxy(data, {
      get(target, prop) {
        // Handle special methods
        if (prop === 'toJSON') return () => target;
        if (prop === 'valueOf') return () => target;
        if (prop === 'toString') return () => JSON.stringify(target);
        
        // If property exists in the object, wrap the value with createSmartDollar
        if (prop in target) {
          const value = target[prop];
          // For functions, return them directly to avoid wrapping
          if (typeof value === 'function') {
            return value.bind(target);
          }
          // Recursively apply createSmartDollar to enable chaining
          return globalThis.createSmartDollar(value);
        }
        
        return undefined;
      },
      has(target, prop) {
        return prop in target;
      },
      ownKeys(target) {
        return Object.keys(target);
      },
      getOwnPropertyDescriptor(target, prop) {
        if (prop in target) {
          return {
            configurable: true,
            enumerable: true,
            value: target[prop]
          };
        }
        return undefined;
      }
    });
  }
  
  // For strings, add async methods that treat the string as a single value
  if (typeof data === 'string') {
    const stringObj = Object(data);
    
    // Add async methods to string
    Object.defineProperty(stringObj, 'mapAsync', {
      value: function(fn) {
        // Treat string as single value, not array of chars
        return Promise.resolve(fn(data, 0)).then(result => 
          globalThis.createSmartDollar([result])
        );
      },
      enumerable: false,
      configurable: true
    });
    
    Object.defineProperty(stringObj, 'mapAsyncSeq', {
      value: function(fn) {
        // Treat string as single value
        return Promise.resolve(fn(data, 0)).then(result => 
          globalThis.createSmartDollar([result])
        );
      },
      enumerable: false,
      configurable: true
    });
    
    Object.defineProperty(stringObj, 'forEachAsync', {
      value: function(fn) {
        // Treat string as single value
        return Promise.resolve(fn(data, 0));
      },
      enumerable: false,
      configurable: true
    });
    
    Object.defineProperty(stringObj, 'forEachAsyncSeq', {
      value: function(fn) {
        // Treat string as single value
        return Promise.resolve(fn(data, 0));
      },
      enumerable: false,
      configurable: true
    });
    
    // Clean up tracking before returning
    if (globalThis._smartDollarProcessing) {
      globalThis._smartDollarProcessing.delete(data);
    }
    return stringObj;
  }
  
  // Clean up the tracking set for this object
  if (globalThis._smartDollarProcessing && typeof data === 'object' && data !== null) {
    globalThis._smartDollarProcessing.delete(data);
  }
  
  // For other primitives, return them directly
  return data;
};
`;

module.exports = createSmartDollarCode;
