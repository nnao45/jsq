export const SMART_DOLLAR_METHODS = `
if (typeof smartDollarMethods === 'undefined') {
  // Helper function to create new instances  
  const createNewInstance = function(data) {
    // Check if we can use the constructor
    if (this && this.constructor) {
      try {
        return new this.constructor(data);
      } catch (e) {
        // Constructor might not work properly in all contexts
      }
    }
    
    // If we have access to global SmartDollar with createInstance, use it
    if (typeof globalThis.SmartDollar !== 'undefined' && 
        typeof globalThis.SmartDollar.createInstance === 'function') {
      return globalThis.SmartDollar.createInstance(data);
    }
    
    // Otherwise try direct SmartDollar constructor
    if (typeof globalThis.SmartDollar !== 'undefined') {
      return new globalThis.SmartDollar(data);
    }
    
    // Fallback: return raw data
    return data;
  };
  
  globalThis.smartDollarMethods = {
  // Array methods
  map: function(dataOrFn, fn) {
    // Handle both $.map(array, fn) and array.map(fn) usage
    let data, mapFn;
    if (arguments.length === 1) {
      // Instance method: array.map(fn)
      data = this._value;
      mapFn = dataOrFn;
    } else {
      // Static method: $.map(array, fn)
      data = dataOrFn;
      mapFn = fn;
    }
    
    if (data === null || data === undefined) {
      return createNewInstance.call(this, []);
    }
    const mapped = Array.from(data).map((item, index) => mapFn(item, index, data));
    return createNewInstance.call(this, mapped);
  },
  
  filter: function(dataOrFn, fn) {
    // Handle both $.filter(array, fn) and array.filter(fn) usage
    let data, filterFn;
    if (arguments.length === 1) {
      // Instance method: array.filter(fn)
      data = this._value;
      filterFn = dataOrFn;
    } else {
      // Static method: $.filter(array, fn)
      data = dataOrFn;
      filterFn = fn;
    }
    
    if (data === null || data === undefined) {
      return createNewInstance.call(this, []);
    }
    const filtered = Array.from(data).filter((item, index) => filterFn(item, index, data));
    return createNewInstance.call(this, filtered);
  },
  
  reduce: function(fn, initial) {
    if (this._value === null || this._value === undefined) {
      return initial;
    }
    return Array.from(this._value).reduce(fn, initial);
  },
  
  slice: function(start, end) {
    if (this._value === null || this._value === undefined) {
      return createNewInstance.call(this, []);
    }
    const sliced = Array.from(this._value).slice(start, end);
    return createNewInstance.call(this, sliced);
  },
  
  concat: function(...args) {
    const concatenated = Array.from(this._value).concat(...args);
    return createNewInstance.call(this, concatenated);
  },
  
  push: function(...elements) {
    // Mutate the original array if it's an array
    if (Array.isArray(this._value)) {
      return this._value.push(...elements);
    }
    // Fallback for non-arrays
    const arr = Array.from(this._value);
    arr.push(...elements);
    return arr.length;
  },
  
  pop: function() {
    // Mutate the original array if it's an array
    if (Array.isArray(this._value)) {
      return this._value.pop();
    }
    // Fallback for non-arrays
    const arr = Array.from(this._value);
    return arr.pop();
  },
  
  shift: function() {
    // Mutate the original array if it's an array
    if (Array.isArray(this._value)) {
      return this._value.shift();
    }
    // Fallback for non-arrays
    const arr = Array.from(this._value);
    return arr.shift();
  },
  
  unshift: function(...elements) {
    // Mutate the original array if it's an array
    if (Array.isArray(this._value)) {
      return this._value.unshift(...elements);
    }
    // Fallback for non-arrays
    const arr = Array.from(this._value);
    arr.unshift(...elements);
    return arr.length;
  },
  
  splice: function(start, deleteCount, ...items) {
    // Mutate the original array if it's an array
    if (Array.isArray(this._value)) {
      return this._value.splice(start, deleteCount, ...items);
    }
    // Fallback for non-arrays
    const arr = Array.from(this._value);
    return arr.splice(start, deleteCount, ...items);
  },
  
  find: function(fn) {
    const found = Array.from(this._value).find((item, index) => fn(item, index, this._value));
    return found !== undefined ? new this.constructor(found) : new this.constructor(null);
  },
  
  some: function(fn) {
    return Array.from(this._value).some((item, index) => fn(item, index, this._value));
  },
  
  every: function(fn) {
    return Array.from(this._value).every((item, index) => fn(item, index, this._value));
  },
  
  includes: function(searchElement, fromIndex) {
    return Array.from(this._value).includes(searchElement, fromIndex);
  },
  
  indexOf: function(searchElement, fromIndex) {
    return Array.from(this._value).indexOf(searchElement, fromIndex);
  },
  
  lastIndexOf: function(searchElement, fromIndex) {
    // Manual implementation due to weird issue with Array.from and new Function
    const arr = Array.isArray(this._value) ? this._value : Array.from(this._value);
    const len = arr.length;
    
    if (len === 0) return -1;
    
    let n = fromIndex == null ? len - 1 : Number(fromIndex);
    
    if (n >= len) {
      n = len - 1;
    } else if (n < 0) {
      n = len + n;
      if (n < 0) return -1;
    }
    
    for (let i = n; i >= 0; i--) {
      if (arr[i] === searchElement) {
        return i;
      }
    }
    
    return -1;
  },
  
  findIndex: function(predicate, thisArg) {
    return Array.from(this._value).findIndex(predicate, thisArg);
  },
  
  join: function(separator) {
    return Array.from(this._value).join(separator);
  },
  
  reverse: function() {
    // Mutate the original array if it's an array
    if (Array.isArray(this._value)) {
      this._value.reverse();
      return this; // Return this for chaining
    }
    // Fallback for non-arrays
    const reversed = Array.from(this._value).reverse();
    return createNewInstance.call(this, reversed);
  },
  
  sort: function(compareFn) {
    // Mutate the original array if it's an array
    if (Array.isArray(this._value)) {
      this._value.sort(compareFn);
      return this; // Return this for chaining
    }
    // Fallback for non-arrays
    const sorted = Array.from(this._value).sort(compareFn);
    return createNewInstance.call(this, sorted);
  },
  
  // Object methods
  keys: function() {
    const keys = Object.keys(this._value);
    return createNewInstance.call(this, keys);
  },
  
  values: function() {
    const values = Object.values(this._value);
    return createNewInstance.call(this, values);
  },
  
  entries: function() {
    const entries = Object.entries(this._value);
    return createNewInstance.call(this, entries);
  },
  
  hasOwn: function(prop) {
    return Object.hasOwn(this._value, prop);
  },
  
  assign: function(...sources) {
    const assigned = Object.assign({}, this._value, ...sources);
    return createNewInstance.call(this, assigned);
  },
  
  // String methods
  split: function(separator, limit) {
    const parts = String(this._value).split(separator, limit);
    return createNewInstance.call(this, parts);
  },
  
  replace: function(search, replacement) {
    const replaced = String(this._value).replace(search, replacement);
    return createNewInstance.call(this, replaced);
  },
  
  replaceAll: function(search, replacement) {
    const replaced = String(this._value).replaceAll(search, replacement);
    return createNewInstance.call(this, replaced);
  },
  
  toLowerCase: function() {
    const lowered = String(this._value).toLowerCase();
    return createNewInstance.call(this, lowered);
  },
  
  toUpperCase: function() {
    const uppered = String(this._value).toUpperCase();
    return createNewInstance.call(this, uppered);
  },
  
  trim: function() {
    const trimmed = String(this._value).trim();
    return createNewInstance.call(this, trimmed);
  },
  
  substring: function(start, end) {
    const sub = String(this._value).substring(start, end);
    return createNewInstance.call(this, sub);
  },
  
  charAt: function(index) {
    return String(this._value).charAt(index);
  },
  
  charCodeAt: function(index) {
    return String(this._value).charCodeAt(index);
  },
  
  startsWith: function(searchString, position) {
    return String(this._value).startsWith(searchString, position);
  },
  
  endsWith: function(searchString, position) {
    return String(this._value).endsWith(searchString, position);
  },
  
  padStart: function(targetLength, padString) {
    const padded = String(this._value).padStart(targetLength, padString);
    return createNewInstance.call(this, padded);
  },
  
  padEnd: function(targetLength, padString) {
    const padded = String(this._value).padEnd(targetLength, padString);
    return createNewInstance.call(this, padded);
  },
  
  match: function(regexp) {
    const matches = String(this._value).match(regexp);
    return matches ? new this.constructor(matches) : new this.constructor(null);
  },
  
  search: function(regexp) {
    return String(this._value).search(regexp);
  },
  
  // Number methods
  toFixed: function(digits) {
    return Number(this._value).toFixed(digits);
  },
  
  toExponential: function(fractionDigits) {
    return Number(this._value).toExponential(fractionDigits);
  },
  
  toPrecision: function(precision) {
    return Number(this._value).toPrecision(precision);
  },
  
  // Type conversion methods
  toString: function() {
    if (this._value === null || this._value === undefined) {
      return '';
    }
    return String(this._value);
  },
  
  toNumber: function() {
    return Number(this._value);
  },
  
  toBoolean: function() {
    return Boolean(this._value);
  },
  
  toArray: function() {
    if (Array.isArray(this._value)) {
      return Array.from(this._value);
    }
    if (this._value && typeof this._value === 'object' && this._value.constructor === Object) {
      return Object.entries(this._value);
    }
    return [this._value];
  },
  
  // Utility methods
  pipe: function(...fns) {
    return fns.reduce((acc, fn) => new this.constructor(fn(acc._value)), this);
  },
  
  tap: function(fn) {
    fn(this._value);
    return this;
  },
  
  value: function() {
    // Also update public value property for VM unwrapping
    this.value = this._value;
    return this._value;
  },
  
  valueOf: function() {
    return this._value;
  },
  
  isNull: function() {
    return this._value === null;
  },
  
  isUndefined: function() {
    return this._value === undefined;
  },
  
  isNullOrUndefined: function() {
    return this._value === null || this._value === undefined;
  },
  
  isEmpty: function() {
    if (this._value === null || this._value === undefined) return true;
    if (Array.isArray(this._value)) return this._value.length === 0;
    if (typeof this._value === 'string') return this._value.length === 0;
    if (typeof this._value === 'object') return Object.keys(this._value).length === 0;
    return false;
  },
  
  // Chainable conditions
  when: function(condition, trueFn, falseFn) {
    if (condition) {
      return trueFn ? new this.constructor(trueFn(this._value)) : this;
    } else {
      return falseFn ? new this.constructor(falseFn(this._value)) : this;
    }
  },
  
  unless: function(condition, fn) {
    return this.when(!condition, fn);
  },
  
  // Lodash-like methods
  where: function(properties, value) {
    const filtered = Array.from(this._value).filter(item => {
      if (!item || typeof item !== 'object') return false;
      
      // If called with two arguments (key, value)
      if (typeof properties === 'string' && value !== undefined) {
        return item[properties] === value;
      }
      
      // If called with object (properties)
      if (typeof properties === 'object' && properties !== null) {
        return Object.entries(properties).every(([key, val]) => item[key] === val);
      }
      
      return false;
    });
    return createNewInstance.call(this, filtered);
  },
  
  pluck: function(property) {
    const plucked = Array.from(this._value).map(item => item ? item[property] : undefined);
    return createNewInstance.call(this, plucked);
  },
  
  sortBy: function(iteratee) {
    const sorted = Array.from(this._value).sort((a, b) => {
      const aVal = typeof iteratee === 'function' ? iteratee(a) : a[iteratee];
      const bVal = typeof iteratee === 'function' ? iteratee(b) : b[iteratee];
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
      return 0;
    });
    return createNewInstance.call(this, sorted);
  },
  
  groupBy: function(iteratee) {
    const grouped = Array.from(this._value).reduce((acc, item) => {
      const key = typeof iteratee === 'function' ? iteratee(item) : item[iteratee];
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
    return createNewInstance.call(this, grouped);
  },
  
  countBy: function(iteratee) {
    const counted = Array.from(this._value).reduce((acc, item) => {
      const key = typeof iteratee === 'function' ? iteratee(item) : item[iteratee];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return createNewInstance.call(this, counted);
  },
  
  take: function(n) {
    const taken = Array.from(this._value).slice(0, n);
    return createNewInstance.call(this, taken);
  },
  
  skip: function(n) {
    const skipped = Array.from(this._value).slice(n);
    return createNewInstance.call(this, skipped);
  },
  
  uniqBy: function(iteratee) {
    const seen = new Map();
    const unique = Array.from(this._value).filter(item => {
      const key = typeof iteratee === 'function' ? iteratee(item) : item[iteratee];
      if (seen.has(key)) return false;
      seen.set(key, true);
      return true;
    });
    return createNewInstance.call(this, unique);
  },
  
  flatten: function() {
    const flattened = Array.from(this._value).reduce((acc, val) => 
      acc.concat(Array.isArray(val) ? val : [val]), []);
    return createNewInstance.call(this, flattened);
  },
  
  flatMap: function(fn) {
    if (this._value === null || this._value === undefined) {
      return createNewInstance.call(this, []);
    }
    const mapped = Array.from(this._value).flatMap((item, index) => fn(item, index, this._value));
    return createNewInstance.call(this, mapped);
  },
  
  flattenDeep: function(data) {
    const flattenDeepRecursive = (arr) => {
      return arr.reduce((acc, val) => 
        acc.concat(Array.isArray(val) ? flattenDeepRecursive(val) : val), []);
    };
    // If called with an argument, use that instead of this._value
    const target = arguments.length > 0 ? data : this._value;
    const flattened = flattenDeepRecursive(Array.from(target));
    return createNewInstance.call(this, flattened);
  },
  
  compact: function(data) {
    // If called with an argument, use that instead of this._value
    const target = arguments.length > 0 ? data : this._value;
    const compacted = Array.from(target).filter(Boolean);
    return createNewInstance.call(this, compacted);
  },
  
  chunk: function(size) {
    const arr = Array.from(this._value);
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return createNewInstance.call(this, chunks);
  },
  
  sum: function(key) {
    const arr = Array.from(this._value);
    if (key && typeof key === 'string') {
      return arr.reduce((acc, val) => acc + (Number(val?.[key]) || 0), 0);
    }
    return arr.reduce((acc, val) => acc + (Number(val) || 0), 0);
  },
  
  mean: function() {
    const arr = Array.from(this._value);
    if (arr.length === 0) return NaN;
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
      sum += Number(arr[i]) || 0;
    }
    return sum / arr.length;
  },
  
  size: function() {
    if (Array.isArray(this._value) || typeof this._value === 'string') {
      return this._value.length;
    }
    if (this._value && typeof this._value === 'object') {
      return Object.keys(this._value).length;
    }
    return 0;
  },
  
  orderBy: function(iteratees, orders) {
    const arr = Array.from(this._value);
    const iterateeArr = Array.isArray(iteratees) ? iteratees : [iteratees];
    const orderArr = Array.isArray(orders) ? orders : [orders];
    
    const sorted = arr.sort((a, b) => {
      for (let i = 0; i < iterateeArr.length; i++) {
        const iteratee = iterateeArr[i];
        const order = orderArr[i] || 'asc';
        const aVal = typeof iteratee === 'function' ? iteratee(a) : a[iteratee];
        const bVal = typeof iteratee === 'function' ? iteratee(b) : b[iteratee];
        
        if (aVal < bVal) return order === 'asc' ? -1 : 1;
        if (aVal > bVal) return order === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return createNewInstance.call(this, sorted);
  },
  
  keyBy: function(iteratee) {
    const keyed = Array.from(this._value).reduce((acc, item) => {
      const key = typeof iteratee === 'function' ? iteratee(item) : item[iteratee];
      acc[key] = item;
      return acc;
    }, {});
    return createNewInstance.call(this, keyed);
  },
  
  takeWhile: function(predicate) {
    const arr = Array.from(this._value);
    const taken = [];
    for (let i = 0; i < arr.length; i++) {
      if (!predicate(arr[i], i, arr)) break;
      taken.push(arr[i]);
    }
    return createNewInstance.call(this, taken);
  },
  
  dropWhile: function(predicate) {
    const arr = Array.from(this._value);
    let dropIndex = 0;
    for (let i = 0; i < arr.length; i++) {
      if (!predicate(arr[i], i, arr)) {
        dropIndex = i;
        break;
      }
    }
    return createNewInstance.call(this, arr.slice(dropIndex));
  },
  
  min: function() {
    const arr = Array.from(this._value);
    if (arr.length === 0) return undefined;
    return Math.min(...arr);
  },
  
  max: function() {
    const arr = Array.from(this._value);
    if (arr.length === 0) return undefined;
    return Math.max(...arr);
  },
  
  minBy: function(iteratee) {
    const arr = Array.from(this._value);
    if (arr.length === 0) return undefined;
    return arr.reduce((min, item) => {
      const itemVal = typeof iteratee === 'function' ? iteratee(item) : item[iteratee];
      const minVal = typeof iteratee === 'function' ? iteratee(min) : min[iteratee];
      return itemVal < minVal ? item : min;
    });
  },
  
  maxBy: function(iteratee) {
    const arr = Array.from(this._value);
    if (arr.length === 0) return undefined;
    return arr.reduce((max, item) => {
      const itemVal = typeof iteratee === 'function' ? iteratee(item) : item[iteratee];
      const maxVal = typeof iteratee === 'function' ? iteratee(max) : max[iteratee];
      return itemVal > maxVal ? item : max;
    });
  },
  
  sample: function() {
    const arr = Array.from(this._value);
    if (arr.length === 0) return undefined;
    return arr[Math.floor(Math.random() * arr.length)];
  },
  
  sampleSize: function(n) {
    const arr = Array.from(this._value);
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return createNewInstance.call(this, shuffled.slice(0, n));
  },
  
  shuffle: function() {
    const arr = Array.from(this._value);
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return createNewInstance.call(this, shuffled);
  },
  
  // Async methods
  mapAsync: async function(fn) {
    // Convert to array using same logic as toArray method
    let arr;
    if (Array.isArray(this._value)) {
      arr = Array.from(this._value);
    } else {
      // For non-arrays, treat as single value
      arr = [this._value];
    }
    const promises = arr.map((item, index) => fn(item, index, arr));
    const results = await Promise.all(promises);
    return createNewInstance.call(this, results);
  },
  
  mapAsyncSeq: async function(fn) {
    const results = [];
    // Convert to array using same logic as toArray method
    let arr;
    if (Array.isArray(this._value)) {
      arr = Array.from(this._value);
    } else {
      // For non-arrays, treat as single value
      arr = [this._value];
    }
    for (let i = 0; i < arr.length; i++) {
      results.push(await fn(arr[i], i, arr));
    }
    return createNewInstance.call(this, results);
  },
  
  forEachAsync: async function(fn) {
    // Convert to array using same logic as toArray method
    let arr;
    if (Array.isArray(this._value)) {
      arr = Array.from(this._value);
    } else {
      // For non-arrays, treat as single value
      arr = [this._value];
    }
    const promises = arr.map((item, index) => fn(item, index, arr));
    await Promise.all(promises);
  },
  
  forEachAsyncSeq: async function(fn) {
    // Convert to array using same logic as toArray method
    let arr;
    if (Array.isArray(this._value)) {
      arr = Array.from(this._value);
    } else {
      // For non-arrays, treat as single value
      arr = [this._value];
    }
    for (let i = 0; i < arr.length; i++) {
      await fn(arr[i], i, arr);
    }
  }
};
}
`;

export const ASYNC_METHODS = [
  'map',
  'filter',
  'find',
  'some',
  'every',
  'reduce',
  'pipe',
  'tap',
  'when',
  'unless',
];

export const VM_SMART_DOLLAR_CLASS = `
if (typeof SmartDollar === 'undefined') {
  globalThis.SmartDollar = class SmartDollar {
  constructor(value) {
    this._value = value;
    // Add public value property for VM unwrapping
    this.value = value;
    // Add identifier for VM unwrapping
    this.__isSmartDollar = true;
    
    // Use a Proxy to handle property access on the wrapped value
    return new Proxy(this, {
      get(target, prop) {
        // Critical SmartDollar properties that should always be from SmartDollar
        const criticalProps = ['_value', '__isSmartDollar', 'constructor', Symbol.iterator, Symbol.toPrimitive];
        if (criticalProps.includes(prop) || typeof prop === 'symbol') {
          return target[prop];
        }
        
        // For 'length', use SmartDollar's length getter
        if (prop === 'length') {
          return target.length;
        }
        
        // PRIORITIZE: Check if it's a property of the wrapped value BEFORE SmartDollar methods
        // BUT: For array methods that exist both on Array and SmartDollar, prefer SmartDollar
        const arrayMethodsToPreferFromSmartDollar = ['map', 'filter', 'find', 'some', 'every', 'reduce', 
          'slice', 'concat', 'push', 'pop', 'shift', 'unshift', 'splice', 'includes', 'indexOf', 
          'lastIndexOf', 'findIndex', 'join', 'reverse', 'sort', 'keys', 'values', 'entries', 
          'flatMap', 'flatten', 'flattenDeep'];
        
        if (Array.isArray(target._value) && arrayMethodsToPreferFromSmartDollar.includes(prop)) {
          // For arrays, prefer SmartDollar methods for common array operations
          if (target.constructor.prototype.hasOwnProperty(prop)) {
            return target[prop];
          }
        }
        
        if (target._value !== null && target._value !== undefined && typeof target._value === 'object' && prop in target._value) {
          const propValue = target._value[prop];
          // For functions on the wrapped value, only return them if they're not array methods we want to override
          if (typeof propValue === 'function' && Array.isArray(target._value) && arrayMethodsToPreferFromSmartDollar.includes(prop)) {
            // Skip returning native array methods, let SmartDollar methods be used instead
          } else {
            // For primitives, return directly
            if (propValue === null || propValue === undefined || 
                typeof propValue === 'string' || typeof propValue === 'number' || 
                typeof propValue === 'boolean') {
              return propValue;
            }
            // For functions, return bound function
            if (typeof propValue === 'function') {
              return propValue.bind(target._value);
            }
            // Wrap objects/arrays in SmartDollar
            return new SmartDollar(propValue);
          }
        }
        
        // Special handling for 'value' - if the wrapped object has a 'value' property, prioritize that
        if (prop === 'value' && target._value !== null && target._value !== undefined && 
            typeof target._value === 'object' && 'value' in target._value) {
          const propValue = target._value.value;
          // For primitives, return directly
          if (propValue === null || propValue === undefined || 
              typeof propValue === 'string' || typeof propValue === 'number' || 
              typeof propValue === 'boolean') {
            return propValue;
          }
          // Wrap objects/arrays in SmartDollar
          return new SmartDollar(propValue);
        }
        
        // Check if it's a SmartDollar method (from prototype)
        if (target.constructor.prototype.hasOwnProperty(prop)) {
          return target[prop];
        }
        
        // Finally check if it's a SmartDollar property not on prototype
        if (prop in target) {
          return target[prop];
        }
        
        return undefined;
      },
      
      has(target, prop) {
        if (prop in target) return true;
        if (target._value !== null && target._value !== undefined && typeof target._value === 'object' && prop in target._value) return true;
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
  }
  
  get length() {
    if (this._value === null || this._value === undefined) {
      return 0;
    }
    if (Array.isArray(this._value) || typeof this._value === 'string') {
      return this._value.length;
    }
    if (this._value && typeof this._value === 'object') {
      return Object.keys(this._value).length;
    }
    return 0;
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
  
  toJSON() {
    return this._value;
  }
  
  valueOf() {
    return this._value;
  }
  
  toString() {
    if (this._value === null) return 'null';
    if (this._value === undefined) return 'undefined';
    return String(this._value);
  }
  
  [Symbol.toPrimitive](hint) {
    if (hint === 'string') {
      return this.toString();
    }
    return this._value;
  }
}
}

// Apply all methods to SmartDollar prototype
// Use the globally defined smartDollarMethods object
if (typeof globalThis.smartDollarMethods !== 'undefined' && typeof globalThis.SmartDollar !== 'undefined') {
  Object.entries(globalThis.smartDollarMethods).forEach(([name, fn]) => {
    globalThis.SmartDollar.prototype[name] = fn;
  });
}

// Create the smart dollar function
function $(value) {
  return new globalThis.SmartDollar(value);
}

// Export createSmartDollar as an alias
globalThis.createSmartDollar = $;
`;
