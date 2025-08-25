export const LODASH_DOLLAR_METHODS = `
// Helper function to convert to array (VM-safe)
function toArray(value) {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value;
  // For array-like objects
  if (typeof value === 'object' && typeof value.length === 'number') {
    const arr = [];
    for (let i = 0; i < value.length; i++) {
      arr.push(value[i]);
    }
    return arr;
  }
  return [value];
}

// Always define lodashDollarMethods
globalThis.lodashDollarMethods = {
  // Array methods from lodash
  filter: function(predicate) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = toArray(this._value);
    const filtered = [];
    for (let i = 0; i < arr.length; i++) {
      if (predicate(arr[i], i, this._value)) {
        filtered.push(arr[i]);
      }
    }
    return new this.constructor(filtered);
  },
  
  map: function(iteratee) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = toArray(this._value);
    const mapped = [];
    for (let i = 0; i < arr.length; i++) {
      mapped.push(iteratee(arr[i], i, this._value));
    }
    return new this.constructor(mapped);
  },
  
  find: function(predicate) {
    const arr = toArray(this._value);
    for (let i = 0; i < arr.length; i++) {
      if (predicate(arr[i], i, this._value)) {
        return arr[i];
      }
    }
    return undefined;
  },
  
  findIndex: function(predicate) {
    const arr = toArray(this._value);
    for (let i = 0; i < arr.length; i++) {
      if (predicate(arr[i], i, this._value)) {
        return i;
      }
    }
    return -1;
  },
  
  reduce: function(iteratee, accumulator) {
    if (this._value === null || this._value === undefined) {
      return accumulator;
    }
    const arr = toArray(this._value);
    let result = accumulator;
    const startIndex = accumulator !== undefined ? 0 : 1;
    if (accumulator === undefined && arr.length > 0) {
      result = arr[0];
    }
    for (let i = startIndex; i < arr.length; i++) {
      result = iteratee(result, arr[i], i, this._value);
    }
    return result;
  },
  
  // Lodash specific array methods
  where: function(properties) {
    const arr = toArray(this._value);
    const filtered = [];
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      if (!item || typeof item !== 'object') continue;
      let matches = true;
      for (const [key, val] of Object.entries(properties)) {
        if (item[key] !== val) {
          matches = false;
          break;
        }
      }
      if (matches) {
        filtered.push(item);
      }
    }
    return new this.constructor(filtered);
  },
  
  pluck: function(property) {
    const arr = toArray(this._value);
    const plucked = [];
    for (let i = 0; i < arr.length; i++) {
      plucked.push(arr[i] ? arr[i][property] : undefined);
    }
    return new this.constructor(plucked);
  },
  
  sortBy: function(iteratee) {
    const arr = toArray(this._value);
    const sorted = [];
    for (let i = 0; i < arr.length; i++) {
      sorted.push(arr[i]);
    }
    // Simple bubble sort for VM compatibility
    for (let i = 0; i < sorted.length - 1; i++) {
      for (let j = 0; j < sorted.length - i - 1; j++) {
        const aVal = typeof iteratee === 'function' ? iteratee(sorted[j]) : sorted[j][iteratee];
        const bVal = typeof iteratee === 'function' ? iteratee(sorted[j + 1]) : sorted[j + 1][iteratee];
        if (aVal > bVal) {
          const temp = sorted[j];
          sorted[j] = sorted[j + 1];
          sorted[j + 1] = temp;
        }
      }
    }
    return new this.constructor(sorted);
  },
  
  orderBy: function(iteratees, orders) {
    const iterateeArr = Array.isArray(iteratees) ? iteratees : [iteratees];
    const orderArr = Array.isArray(orders) ? orders : [orders];
    
    const arr = toArray(this._value);
    const sorted = [];
    for (let i = 0; i < arr.length; i++) {
      sorted.push(arr[i]);
    }
    
    // Bubble sort with multiple keys
    for (let i = 0; i < sorted.length - 1; i++) {
      for (let j = 0; j < sorted.length - i - 1; j++) {
        let shouldSwap = false;
        
        for (let k = 0; k < iterateeArr.length; k++) {
          const iteratee = iterateeArr[k];
          const order = orderArr[k] || 'asc';
          const aVal = typeof iteratee === 'function' ? iteratee(sorted[j]) : sorted[j][iteratee];
          const bVal = typeof iteratee === 'function' ? iteratee(sorted[j + 1]) : sorted[j + 1][iteratee];
          
          if (aVal < bVal) {
            shouldSwap = order === 'desc';
            break;
          }
          if (aVal > bVal) {
            shouldSwap = order === 'asc';
            break;
          }
        }
        
        if (shouldSwap) {
          const temp = sorted[j];
          sorted[j] = sorted[j + 1];
          sorted[j + 1] = temp;
        }
      }
    }
    return new this.constructor(sorted);
  },
  
  groupBy: function(iteratee) {
    const arr = toArray(this._value);
    const grouped = {};
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      const key = typeof iteratee === 'function' ? iteratee(item) : item[iteratee];
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }
    return new this.constructor(grouped);
  },
  
  countBy: function(iteratee) {
    const arr = toArray(this._value);
    const counted = {};
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      const key = typeof iteratee === 'function' ? iteratee(item) : item[iteratee];
      counted[key] = (counted[key] || 0) + 1;
    }
    return new this.constructor(counted);
  },
  
  keyBy: function(iteratee) {
    const arr = toArray(this._value);
    const keyed = {};
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      const key = typeof iteratee === 'function' ? iteratee(item) : item[iteratee];
      keyed[key] = item;
    }
    return new this.constructor(keyed);
  },
  
  take: function(n) {
    const arr = toArray(this._value);
    const taken = [];
    for (let i = 0; i < Math.min(n, arr.length); i++) {
      taken.push(arr[i]);
    }
    return new this.constructor(taken);
  },
  
  skip: function(n) {
    const arr = toArray(this._value);
    const skipped = [];
    for (let i = n; i < arr.length; i++) {
      skipped.push(arr[i]);
    }
    return new this.constructor(skipped);
  },
  
  drop: function(n) {
    return this.skip(n);
  },
  
  takeWhile: function(predicate) {
    const arr = toArray(this._value);
    const taken = [];
    for (let i = 0; i < arr.length; i++) {
      if (!predicate(arr[i], i, arr)) break;
      taken.push(arr[i]);
    }
    return new this.constructor(taken);
  },
  
  dropWhile: function(predicate) {
    const arr = toArray(this._value);
    let dropIndex = 0;
    for (let i = 0; i < arr.length; i++) {
      if (!predicate(arr[i], i, arr)) {
        dropIndex = i;
        break;
      }
    }
    const result = [];
    for (let i = dropIndex; i < arr.length; i++) {
      result.push(arr[i]);
    }
    return new this.constructor(result);
  },
  
  uniq: function() {
    const arr = toArray(this._value);
    const unique = [];
    const seen = {};
    for (let i = 0; i < arr.length; i++) {
      const val = arr[i];
      const key = typeof val === 'object' ? JSON.stringify(val) : String(val);
      if (!seen[key]) {
        seen[key] = true;
        unique.push(val);
      }
    }
    return new this.constructor(unique);
  },
  
  uniqBy: function(iteratee) {
    const arr = toArray(this._value);
    const seen = {};
    const unique = [];
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      const key = typeof iteratee === 'function' ? iteratee(item) : item[iteratee];
      const keyStr = typeof key === 'object' ? JSON.stringify(key) : String(key);
      if (!seen[keyStr]) {
        seen[keyStr] = true;
        unique.push(item);
      }
    }
    return new this.constructor(unique);
  },
  
  sample: function() {
    const arr = toArray(this._value);
    if (arr.length === 0) return undefined;
    return arr[Math.floor(Math.random() * arr.length)];
  },
  
  sampleSize: function(n) {
    const arr = toArray(this._value);
    const shuffled = [];
    for (let i = 0; i < arr.length; i++) {
      shuffled.push(arr[i]);
    }
    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }
    const result = [];
    for (let i = 0; i < Math.min(n, shuffled.length); i++) {
      result.push(shuffled[i]);
    }
    return new this.constructor(result);
  },
  
  shuffle: function() {
    const arr = toArray(this._value);
    const shuffled = [];
    for (let i = 0; i < arr.length; i++) {
      shuffled.push(arr[i]);
    }
    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }
    return new this.constructor(shuffled);
  },
  
  flatten: function() {
    const arr = toArray(this._value);
    const flattened = [];
    for (let i = 0; i < arr.length; i++) {
      const val = arr[i];
      if (Array.isArray(val)) {
        for (let j = 0; j < val.length; j++) {
          flattened.push(val[j]);
        }
      } else {
        flattened.push(val);
      }
    }
    return new this.constructor(flattened);
  },
  
  flattenDeep: function() {
    const flattenDeepRecursive = (arr) => {
      const result = [];
      for (let i = 0; i < arr.length; i++) {
        const val = arr[i];
        if (Array.isArray(val)) {
          const nested = flattenDeepRecursive(val);
          for (let j = 0; j < nested.length; j++) {
            result.push(nested[j]);
          }
        } else {
          result.push(val);
        }
      }
      return result;
    };
    const flattened = flattenDeepRecursive(toArray(this._value));
    return new this.constructor(flattened);
  },
  
  compact: function() {
    const arr = toArray(this._value);
    const compacted = [];
    for (let i = 0; i < arr.length; i++) {
      if (arr[i]) {
        compacted.push(arr[i]);
      }
    }
    return new this.constructor(compacted);
  },
  
  chunk: function(size) {
    const arr = toArray(this._value);
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      const chunk = [];
      for (let j = i; j < Math.min(i + size, arr.length); j++) {
        chunk.push(arr[j]);
      }
      chunks.push(chunk);
    }
    return new this.constructor(chunks);
  },
  
  reverse: function() {
    const arr = toArray(this._value);
    const reversed = [];
    for (let i = arr.length - 1; i >= 0; i--) {
      reversed.push(arr[i]);
    }
    return new this.constructor(reversed);
  },
  
  // Math methods
  sum: function(iteratee) {
    const arr = toArray(this._value);
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
      const val = arr[i];
      let num;
      if (iteratee && typeof iteratee === 'string') {
        num = Number(val?.[iteratee]) || 0;
      } else if (iteratee && typeof iteratee === 'function') {
        num = Number(iteratee(val)) || 0;
      } else {
        num = Number(val) || 0;
      }
      sum += num;
    }
    return sum;
  },
  
  mean: function() {
    const arr = toArray(this._value);
    if (arr.length === 0) return NaN;
    return this.sum() / arr.length;
  },
  
  min: function() {
    const arr = toArray(this._value);
    if (arr.length === 0) return undefined;
    let min = Number(arr[0]) || 0;
    for (let i = 1; i < arr.length; i++) {
      const num = Number(arr[i]) || 0;
      if (num < min) min = num;
    }
    return min;
  },
  
  max: function() {
    const arr = toArray(this._value);
    if (arr.length === 0) return undefined;
    let max = Number(arr[0]) || 0;
    for (let i = 1; i < arr.length; i++) {
      const num = Number(arr[i]) || 0;
      if (num > max) max = num;
    }
    return max;
  },
  
  minBy: function(iteratee) {
    const arr = toArray(this._value);
    if (arr.length === 0) return undefined;
    let min = arr[0];
    let minVal = typeof iteratee === 'function' ? iteratee(min) : min[iteratee];
    for (let i = 1; i < arr.length; i++) {
      const item = arr[i];
      const itemVal = typeof iteratee === 'function' ? iteratee(item) : item[iteratee];
      if (itemVal < minVal) {
        min = item;
        minVal = itemVal;
      }
    }
    return min;
  },
  
  maxBy: function(iteratee) {
    const arr = toArray(this._value);
    if (arr.length === 0) return undefined;
    let max = arr[0];
    let maxVal = typeof iteratee === 'function' ? iteratee(max) : max[iteratee];
    for (let i = 1; i < arr.length; i++) {
      const item = arr[i];
      const itemVal = typeof iteratee === 'function' ? iteratee(item) : item[iteratee];
      if (itemVal > maxVal) {
        max = item;
        maxVal = itemVal;
      }
    }
    return max;
  },
  
  // Object methods
  pick: function(...args) {
    const result = {};
    const obj = this._value;
    // Support both array syntax and spread syntax
    const keys = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    if (obj && typeof obj === 'object') {
      for (const key of keys) {
        if (key in obj) {
          result[key] = obj[key];
        }
      }
    }
    return new this.constructor(result);
  },
  
  omit: function(...args) {
    const result = {};
    const obj = this._value;
    // Support both array syntax and spread syntax
    const keys = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (!keys.includes(key)) {
          result[key] = obj[key];
        }
      }
    }
    return new this.constructor(result);
  },
  
  keys: function() {
    if (this._value && typeof this._value === 'object') {
      return new this.constructor(Object.keys(this._value));
    }
    return new this.constructor([]);
  },
  
  values: function() {
    if (this._value && typeof this._value === 'object') {
      return new this.constructor(Object.values(this._value));
    }
    return new this.constructor([]);
  },
  
  entries: function() {
    if (this._value && typeof this._value === 'object') {
      return new this.constructor(Object.entries(this._value));
    }
    return new this.constructor([]);
  },
  
  fromPairs: function() {
    const pairs = toArray(this._value);
    const result = {};
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      if (Array.isArray(pair) && pair.length >= 2) {
        result[pair[0]] = pair[1];
      }
    }
    return new this.constructor(result);
  },
  
  invert: function() {
    const result = {};
    const obj = this._value;
    if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        result[String(value)] = key;
      }
    }
    return new this.constructor(result);
  },
  
  merge: function(...sources) {
    const merged = Object.assign({}, this._value, ...sources);
    return new this.constructor(merged);
  },
  
  defaults: function(...sources) {
    const result = { ...this._value };
    for (const source of sources) {
      if (source && typeof source === 'object') {
        for (const [key, value] of Object.entries(source)) {
          if (!(key in result)) {
            result[key] = value;
          }
        }
      }
    }
    return new this.constructor(result);
  },
  
  // String methods
  camelCase: function() {
    const str = String(this._value);
    const camelCased = str
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
      .replace(/^./, chr => chr.toLowerCase());
    return new this.constructor(camelCased);
  },
  
  kebabCase: function() {
    const str = String(this._value);
    // Simpler approach: insert hyphen before any capital letter that follows a lowercase or digit
    let result = str
    .replace(/([a-z])([A-Z])/g, '$1-$2') // Add hyphen between lower/uppercase
    .replace(/[\\s_]+/g, '-')             // Replace spaces/underscores with hyphen
    .toLowerCase();
      
    return new this.constructor(result);
  },
  
  snakeCase: function() {
    const str = String(this._value);
    const result = str && str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .map(s => s.toLowerCase())
    .join('_');
      
    return new this.constructor(result);
  },
  
  startCase: function() {
    const str = String(this._value);
    const startCased = str
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    return new this.constructor(startCased);
  },
  
  upperFirst: function() {
    const str = String(this._value);
    return new this.constructor(str.charAt(0).toUpperCase() + str.slice(1));
  },
  
  lowerFirst: function() {
    const str = String(this._value);
    return new this.constructor(str.charAt(0).toLowerCase() + str.slice(1));
  },
  
  capitalize: function() {
    const str = String(this._value);
    return new this.constructor(str.charAt(0).toUpperCase() + str.slice(1).toLowerCase());
  },
  
  // Utility methods
  size: function() {
    if (Array.isArray(this._value) || typeof this._value === 'string') {
      return this._value.length;
    }
    if (this._value && typeof this._value === 'object') {
      return Object.keys(this._value).length;
    }
    return 0;
  },
  
  isEmpty: function() {
    if (this._value === null || this._value === undefined) return true;
    if (Array.isArray(this._value)) return this._value.length === 0;
    if (typeof this._value === 'string') return this._value.length === 0;
    if (typeof this._value === 'object') return Object.keys(this._value).length === 0;
    return false;
  },
  
  includes: function(value, fromIndex) {
    if (Array.isArray(this._value)) {
      return this._value.includes(value, fromIndex);
    }
    if (typeof this._value === 'string' && typeof value === 'string') {
      return this._value.includes(value, fromIndex);
    }
    if (this._value && typeof this._value === 'object') {
      return Object.values(this._value).includes(value);
    }
    return false;
  },
  
  // Function utilities
  identity: function() {
    return this._value;
  },
  
  constant: function() {
    const val = this._value;
    return function() { return val; };
  },
  
  times: function(iteratee) {
    const n = Number(this._value) || 0;
    const results = [];
    for (let i = 0; i < n; i++) {
      results.push(iteratee(i));
    }
    return new this.constructor(results);
  },
  
  range: function(end, step) {
    const start = Number(this._value) || 0;
    const endNum = end !== undefined ? Number(end) : start;
    const startNum = end !== undefined ? start : 0;
    const stepNum = step || (startNum < endNum ? 1 : -1);
    
    const result = [];
    if (stepNum > 0) {
      for (let i = startNum; i < endNum; i += stepNum) {
        result.push(i);
      }
    } else {
      for (let i = startNum; i > endNum; i += stepNum) {
        result.push(i);
      }
    }
    return new this.constructor(result);
  },
  
  clamp: function(lower, upper) {
    const num = Number(this._value) || 0;
    return Math.max(lower, Math.min(upper, num));
  },
  
  random: function(upper, floating) {
    const lower = Number(this._value) || 0;
    const upperNum = upper !== undefined ? Number(upper) : 1;
    
    if (floating || lower % 1 || upperNum % 1) {
      const rand = Math.random();
      return lower + rand * (upperNum - lower);
    }
    return lower + Math.floor(Math.random() * (upperNum - lower + 1));
  },
  
  // Chain
  chain: function() {
    // Return this for chaining
    return this;
  },
  
  value: function() {
    // Also update public value property for VM unwrapping
    this.value = this._value;
    return this._value;
  },
  
  valueOf: function() {
    return this._value;
  }
};
`;

export const VM_LODASH_DOLLAR_CLASS = `
if (typeof LodashDollar === 'undefined') {
  globalThis.LodashDollar = class LodashDollar {
  constructor(value) {
    this._value = value;
    // Add public value property for VM unwrapping
    this.value = value;
    // Add identifier for VM unwrapping
    this.__isLodashDollar = true;
    
    // Use a Proxy to handle property access on the wrapped value
    return new Proxy(this, {
      get(target, prop) {
        // Critical LodashDollar properties that should always be from LodashDollar
        const criticalProps = ['_value', '__isLodashDollar', 'constructor', 'value', 'valueOf', Symbol.iterator, Symbol.toPrimitive];
        if (criticalProps.includes(prop) || typeof prop === 'symbol') {
          return target[prop];
        }
        
        // For 'length', use wrapped value's length if it exists
        if (prop === 'length') {
          if (target._value && (Array.isArray(target._value) || typeof target._value === 'string')) {
            return target._value.length;
          }
          if (target._value && typeof target._value === 'object') {
            return Object.keys(target._value).length;
          }
          return 0;
        }
        
        // Check if it's a LodashDollar method (from prototype)
        // Use a simpler check that works in VM
        if (prop in target && typeof target[prop] === 'function') {
          return target[prop];
        }
        
        // For wrapped value properties
        if (target._value !== null && target._value !== undefined && typeof target._value === 'object' && prop in target._value) {
          const propValue = target._value[prop];
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
          // Wrap objects/arrays in LodashDollar
          return new LodashDollar(propValue);
        }
        
        return undefined;
      },
      
      has(target, prop) {
        if (prop in target) return true;
        if (target._value !== null && target._value !== undefined && typeof target._value === 'object' && prop in target._value) return true;
        return false;
      },
      
      ownKeys(target) {
        // Return keys from the wrapped value, not LodashDollar's properties
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

// Apply all methods to LodashDollar prototype
// Use the globally defined lodashDollarMethods object
if (typeof globalThis.lodashDollarMethods !== 'undefined' && typeof globalThis.LodashDollar !== 'undefined') {
  Object.entries(globalThis.lodashDollarMethods).forEach(([name, fn]) => {
    globalThis.LodashDollar.prototype[name] = fn;
  });
}

// Create the lodash dollar function
function _(value) {
  return new globalThis.LodashDollar(value);
}

// Export createLodashDollar as an alias
globalThis.createLodashDollar = _;
`;
