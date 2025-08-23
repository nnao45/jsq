// New createSmartDollar implementation that avoids closure issues
const createSmartDollarCode = `
globalThis.createSmartDollar = function(data) {
  // Special handling for null/undefined
  if (data === null || data === undefined) {
    return data;
  }
  
  // For arrays, return a proxy that adds methods without attaching them
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
        return target.includes(value);
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
        return Promise.all(arrayTarget.map(fn)).then(results => 
          globalThis.createSmartDollar(results)
        );
      },
      mapAsyncSeq: function(target, fn) {
        return target.reduce((promise, item, index) => 
          promise.then(results => 
            Promise.resolve(fn(item, index, target))
              .then(result => [...results, result])
          ), Promise.resolve([])
        ).then(results => globalThis.createSmartDollar(results));
      },
      forEachAsync: function(target, fn) {
        return Promise.all(target.map(fn));
      },
      forEachAsyncSeq: function(target, fn) {
        return target.reduce((promise, item, index) => 
          promise.then(() => fn(item, index, target)), 
          Promise.resolve()
        );
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
    
    // Return a proxy that intercepts method calls
    return new Proxy(data, {
      get(target, prop) {
        // Override specific array methods we want to intercept
        if (prop === 'map' || prop === 'filter' || prop === 'slice' || prop === 'concat' || 
            prop === 'orderBy' || prop === 'groupBy' || prop === 'pluck' || prop === 'entries') {
          if (arrayMethods[prop]) {
            return function(...args) {
              return arrayMethods[prop](target, ...args);
            };
          }
        }
        
        // Check other custom methods
        if (Object.prototype.hasOwnProperty.call(arrayMethods, prop)) {
          return function(...args) {
            return arrayMethods[prop](target, ...args);
          };
        }
        
        // Special handling for find method to wrap result
        if (prop === 'find') {
          return function(...args) {
            const result = Array.prototype.find.apply(target, args);
            if (result !== undefined && typeof result === 'object') {
              return globalThis.createSmartDollar(result);
            }
            return result;
          };
        }
        
        // For array properties and native methods, return them directly
        const value = target[prop];
        if (typeof value === 'function') {
          // Bind native array methods
          return value.bind(target);
        }
        return value;
      }
    });
  }
  
  // For strings, convert to character array to support array methods
  if (typeof data === 'string') {
    const charArray = Array.from(data);
    // Add original string as a property for reference
    charArray._originalString = data;
    return globalThis.createSmartDollar(charArray);
  }
  
  // For objects, create a proxy for property access
  if (typeof data === 'object' && data !== null) {
    const handler = {
      get: function(target, prop) {
        // Check for object-specific methods
        if (prop === 'entries') {
          return function() {
            return globalThis.createSmartDollar(Object.entries(target));
          };
        }
        
        // Special handling for 'value' property - commented out to allow normal access
        // This was causing $.value to return the entire object instead of the property
        // if (prop === 'value') {
        //   return target;
        // }
        
        // For property access, return the value directly (don't wrap primitives)
        if (prop in target) {
          const value = target[prop];
          // Don't wrap primitives - return them directly
          if (value === null || value === undefined ||
              typeof value === 'string' || typeof value === 'number' || 
              typeof value === 'boolean') {
            return value;
          }
          // Always wrap arrays and objects with createSmartDollar
          return globalThis.createSmartDollar(value);
        }
        return undefined;
      }
    };
    
    return new Proxy(data, handler);
  }
  
  // For primitives, return them directly
  return data;
};
`;

module.exports = createSmartDollarCode;
