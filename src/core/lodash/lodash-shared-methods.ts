export const LODASH_METHODS = `
// Always define lodashMethods
globalThis.lodashMethods = {
  // Array methods from lodash
  filter: function(predicate) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
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
    const arr = Array.from(this._value);
    const mapped = [];
    for (let i = 0; i < arr.length; i++) {
      mapped.push(iteratee(arr[i], i, this._value));
    }
    return new this.constructor(mapped);
  },
  
  find: function(predicate) {
    if (this._value === null || this._value === undefined) {
      return undefined;
    }
    const arr = Array.from(this._value);
    for (let i = 0; i < arr.length; i++) {
      if (predicate(arr[i], i, this._value)) {
        return arr[i];
      }
    }
    return undefined;
  },
  
  findIndex: function(predicate) {
    if (this._value === null || this._value === undefined) {
      return -1;
    }
    const arr = Array.from(this._value);
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
    const arr = Array.from(this._value);
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
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
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
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
    const plucked = [];
    for (let i = 0; i < arr.length; i++) {
      plucked.push(arr[i] ? arr[i][property] : undefined);
    }
    return new this.constructor(plucked);
  },
  
  sortBy: function(iteratee) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
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
    
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
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
    if (this._value === null || this._value === undefined) {
      return new this.constructor({});
    }
    const arr = Array.from(this._value);
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
    if (this._value === null || this._value === undefined) {
      return new this.constructor({});
    }
    const arr = Array.from(this._value);
    const counted = {};
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      const key = typeof iteratee === 'function' ? iteratee(item) : item[iteratee];
      counted[key] = (counted[key] || 0) + 1;
    }
    return new this.constructor(counted);
  },
  
  keyBy: function(iteratee) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor({});
    }
    const arr = Array.from(this._value);
    const keyed = {};
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      const key = typeof iteratee === 'function' ? iteratee(item) : item[iteratee];
      keyed[key] = item;
    }
    return new this.constructor(keyed);
  },
  
  take: function(n) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
    const taken = [];
    for (let i = 0; i < Math.min(n, arr.length); i++) {
      taken.push(arr[i]);
    }
    return new this.constructor(taken);
  },
  
  skip: function(n) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
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
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
    const taken = [];
    for (let i = 0; i < arr.length; i++) {
      if (!predicate(arr[i], i, arr)) break;
      taken.push(arr[i]);
    }
    return new this.constructor(taken);
  },
  
  dropWhile: function(predicate) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
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
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
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
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
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
    if (this._value === null || this._value === undefined) {
      return undefined;
    }
    const arr = Array.from(this._value);
    if (arr.length === 0) return undefined;
    return arr[Math.floor(Math.random() * arr.length)];
  },
  
  sampleSize: function(n) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
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
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
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
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
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
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const flattened = flattenDeepRecursive(Array.from(this._value));
    return new this.constructor(flattened);
  },
  
  compact: function() {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
    const compacted = [];
    for (let i = 0; i < arr.length; i++) {
      if (arr[i]) {
        compacted.push(arr[i]);
      }
    }
    return new this.constructor(compacted);
  },
  
  chunk: function(size) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
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
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
    const reversed = [];
    for (let i = arr.length - 1; i >= 0; i--) {
      reversed.push(arr[i]);
    }
    return new this.constructor(reversed);
  },
  
  // Math methods
  sum: function(iteratee) {
    if (this._value === null || this._value === undefined) {
      return 0;
    }
    const arr = Array.from(this._value);
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
  
  sumBy: function(iteratee) {
    if (this._value === null || this._value === undefined) {
      return 0;
    }
    const arr = Array.from(this._value);
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
      const val = arr[i];
      let num;
      if (typeof iteratee === 'string') {
        num = Number(val?.[iteratee]) || 0;
      } else if (typeof iteratee === 'function') {
        num = Number(iteratee(val)) || 0;
      } else {
        num = Number(val) || 0;
      }
      sum += num;
    }
    return sum;
  },
  
  mean: function() {
    if (this._value === null || this._value === undefined) {
      return NaN;
    }
    const arr = Array.from(this._value);
    if (arr.length === 0) return NaN;
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
      sum += Number(arr[i]) || 0;
    }
    return sum / arr.length;
  },
  
  meanBy: function(iteratee) {
    if (this._value === null || this._value === undefined) {
      return NaN;
    }
    const arr = Array.from(this._value);
    if (arr.length === 0) return NaN;
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
      const val = arr[i];
      let num;
      if (typeof iteratee === 'string') {
        num = Number(val?.[iteratee]) || 0;
      } else if (typeof iteratee === 'function') {
        num = Number(iteratee(val)) || 0;
      } else {
        num = Number(val) || 0;
      }
      sum += num;
    }
    return sum / arr.length;
  },
  
  add: function(addend) {
    const augend = Number(this._value) || 0;
    return augend + (Number(addend) || 0);
  },
  
  subtract: function(subtrahend) {
    const minuend = Number(this._value) || 0;
    return minuend - (Number(subtrahend) || 0);
  },
  
  multiply: function(multiplicand) {
    const multiplier = Number(this._value) || 0;
    return multiplier * (Number(multiplicand) || 0);
  },
  
  divide: function(divisor) {
    const dividend = Number(this._value) || 0;
    return dividend / (Number(divisor) || 1);
  },
  
  ceil: function(precision) {
    const num = Number(this._value) || 0;
    precision = precision || 0;
    const factor = Math.pow(10, precision);
    return Math.ceil(num * factor) / factor;
  },
  
  floor: function(precision) {
    const num = Number(this._value) || 0;
    precision = precision || 0;
    const factor = Math.pow(10, precision);
    return Math.floor(num * factor) / factor;
  },
  
  round: function(precision) {
    const num = Number(this._value) || 0;
    precision = precision || 0;
    const factor = Math.pow(10, precision);
    return Math.round(num * factor) / factor;
  },
  
  min: function() {
    if (this._value === null || this._value === undefined) {
      return undefined;
    }
    const arr = Array.from(this._value);
    if (arr.length === 0) return undefined;
    let min = Number(arr[0]) || 0;
    for (let i = 1; i < arr.length; i++) {
      const num = Number(arr[i]) || 0;
      if (num < min) min = num;
    }
    return min;
  },
  
  max: function() {
    if (this._value === null || this._value === undefined) {
      return undefined;
    }
    const arr = Array.from(this._value);
    if (arr.length === 0) return undefined;
    let max = Number(arr[0]) || 0;
    for (let i = 1; i < arr.length; i++) {
      const num = Number(arr[i]) || 0;
      if (num > max) max = num;
    }
    return max;
  },
  
  minBy: function(iteratee) {
    if (this._value === null || this._value === undefined) {
      return undefined;
    }
    const arr = Array.from(this._value);
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
    if (this._value === null || this._value === undefined) {
      return undefined;
    }
    const arr = Array.from(this._value);
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
    if (this._value === null || this._value === undefined) {
      return new this.constructor({});
    }
    const pairs = Array.from(this._value);
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
