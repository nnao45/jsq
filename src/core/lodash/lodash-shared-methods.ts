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
  
  findLast: function(predicate) {
    if (this._value === null || this._value === undefined) {
      return undefined;
    }
    const arr = Array.from(this._value);
    for (let i = arr.length - 1; i >= 0; i--) {
      if (predicate(arr[i], i, this._value)) {
        return arr[i];
      }
    }
    return undefined;
  },
  
  findLastIndex: function(predicate) {
    if (this._value === null || this._value === undefined) {
      return -1;
    }
    const arr = Array.from(this._value);
    for (let i = arr.length - 1; i >= 0; i--) {
      if (predicate(arr[i], i, this._value)) {
        return i;
      }
    }
    return -1;
  },
  
  nth: function(n) {
    if (this._value === null || this._value === undefined) {
      return undefined;
    }
    const arr = Array.from(this._value);
    const index = n >= 0 ? n : arr.length + n;
    return arr[index];
  },
  
  pullAt: function(indexes) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
    const pulled = [];
    const indexArr = Array.isArray(indexes) ? indexes : [indexes];
    
    // Collect elements at specified indexes
    for (let i = 0; i < indexArr.length; i++) {
      const index = indexArr[i];
      if (index >= 0 && index < arr.length) {
        pulled.push(arr[index]);
      }
    }
    
    return new this.constructor(pulled);
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
  
  takeRight: function(n) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
    const startIndex = Math.max(0, arr.length - n);
    const result = [];
    for (let i = startIndex; i < arr.length; i++) {
      result.push(arr[i]);
    }
    return new this.constructor(result);
  },
  
  takeRightWhile: function(predicate) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
    const result = [];
    for (let i = arr.length - 1; i >= 0; i--) {
      if (!predicate(arr[i], i, arr)) break;
      result.unshift(arr[i]);
    }
    return new this.constructor(result);
  },
  
  dropRight: function(n) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
    const endIndex = Math.max(0, arr.length - n);
    const result = [];
    for (let i = 0; i < endIndex; i++) {
      result.push(arr[i]);
    }
    return new this.constructor(result);
  },
  
  dropRightWhile: function(predicate) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
    let endIndex = arr.length;
    for (let i = arr.length - 1; i >= 0; i--) {
      if (!predicate(arr[i], i, arr)) {
        endIndex = i + 1;
        break;
      }
    }
    const result = [];
    for (let i = 0; i < endIndex; i++) {
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
  
  flatMap: function(iteratee) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
    const result = [];
    for (let i = 0; i < arr.length; i++) {
      const mapped = iteratee(arr[i], i, arr);
      if (Array.isArray(mapped)) {
        for (let j = 0; j < mapped.length; j++) {
          result.push(mapped[j]);
        }
      } else {
        result.push(mapped);
      }
    }
    return new this.constructor(result);
  },
  
  flatMapDeep: function(iteratee) {
    const flattenDeepRecursive = (val) => {
      const result = [];
      if (Array.isArray(val)) {
        for (let i = 0; i < val.length; i++) {
          const nested = flattenDeepRecursive(val[i]);
          for (let j = 0; j < nested.length; j++) {
            result.push(nested[j]);
          }
        }
      } else {
        result.push(val);
      }
      return result;
    };
    
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
    const result = [];
    for (let i = 0; i < arr.length; i++) {
      const mapped = iteratee(arr[i], i, arr);
      const flattened = flattenDeepRecursive(mapped);
      for (let j = 0; j < flattened.length; j++) {
        result.push(flattened[j]);
      }
    }
    return new this.constructor(result);
  },
  
  invokeMap: function(path, ...args) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
    const result = [];
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      if (typeof path === 'function') {
        result.push(path.apply(item, args));
      } else if (item && typeof item[path] === 'function') {
        result.push(item[path](...args));
      } else {
        result.push(undefined);
      }
    }
    return new this.constructor(result);
  },
  
  partition: function(predicate) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([[], []]);
    }
    const arr = Array.from(this._value);
    const truthy = [];
    const falsy = [];
    for (let i = 0; i < arr.length; i++) {
      if (predicate(arr[i], i, arr)) {
        truthy.push(arr[i]);
      } else {
        falsy.push(arr[i]);
      }
    }
    return new this.constructor([truthy, falsy]);
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
  
  pullAll: function(values) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
    const result = [];
    for (let i = 0; i < arr.length; i++) {
      let shouldInclude = true;
      for (let j = 0; j < values.length; j++) {
        if (arr[i] === values[j]) {
          shouldInclude = false;
          break;
        }
      }
      if (shouldInclude) {
        result.push(arr[i]);
      }
    }
    return new this.constructor(result);
  },
  
  pullAllBy: function(values, iteratee) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
    const result = [];
    const valueKeys = [];
    for (let i = 0; i < values.length; i++) {
      const key = typeof iteratee === 'function' ? iteratee(values[i]) : values[i][iteratee];
      valueKeys.push(key);
    }
    
    for (let i = 0; i < arr.length; i++) {
      const itemKey = typeof iteratee === 'function' ? iteratee(arr[i]) : arr[i][iteratee];
      let shouldInclude = true;
      for (let j = 0; j < valueKeys.length; j++) {
        if (itemKey === valueKeys[j]) {
          shouldInclude = false;
          break;
        }
      }
      if (shouldInclude) {
        result.push(arr[i]);
      }
    }
    return new this.constructor(result);
  },
  
  differenceBy: function(values, iteratee) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
    const result = [];
    const valueKeys = [];
    for (let i = 0; i < values.length; i++) {
      const key = typeof iteratee === 'function' ? iteratee(values[i]) : values[i][iteratee];
      valueKeys.push(key);
    }
    
    for (let i = 0; i < arr.length; i++) {
      const itemKey = typeof iteratee === 'function' ? iteratee(arr[i]) : arr[i][iteratee];
      let shouldInclude = true;
      for (let j = 0; j < valueKeys.length; j++) {
        if (itemKey === valueKeys[j]) {
          shouldInclude = false;
          break;
        }
      }
      if (shouldInclude) {
        result.push(arr[i]);
      }
    }
    return new this.constructor(result);
  },
  
  differenceWith: function(values, comparator) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
    const result = [];
    
    for (let i = 0; i < arr.length; i++) {
      let shouldInclude = true;
      for (let j = 0; j < values.length; j++) {
        if (comparator(arr[i], values[j])) {
          shouldInclude = false;
          break;
        }
      }
      if (shouldInclude) {
        result.push(arr[i]);
      }
    }
    return new this.constructor(result);
  },
  
  intersectionBy: function(values, iteratee) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
    const result = [];
    const seen = {};
    
    for (let i = 0; i < arr.length; i++) {
      const itemKey = typeof iteratee === 'function' ? iteratee(arr[i]) : arr[i][iteratee];
      const keyStr = typeof itemKey === 'object' ? JSON.stringify(itemKey) : String(itemKey);
      
      for (let j = 0; j < values.length; j++) {
        const valueKey = typeof iteratee === 'function' ? iteratee(values[j]) : values[j][iteratee];
        const valueKeyStr = typeof valueKey === 'object' ? JSON.stringify(valueKey) : String(valueKey);
        
        if (keyStr === valueKeyStr && !seen[keyStr]) {
          seen[keyStr] = true;
          result.push(arr[i]);
          break;
        }
      }
    }
    return new this.constructor(result);
  },
  
  intersectionWith: function(values, comparator) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
    const result = [];
    
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < values.length; j++) {
        if (comparator(arr[i], values[j])) {
          result.push(arr[i]);
          break;
        }
      }
    }
    return new this.constructor(result);
  },
  
  unionBy: function(arrays, iteratee) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
    const result = [];
    const seen = {};
    
    // Process first array
    for (let i = 0; i < arr.length; i++) {
      const key = typeof iteratee === 'function' ? iteratee(arr[i]) : arr[i][iteratee];
      const keyStr = typeof key === 'object' ? JSON.stringify(key) : String(key);
      if (!seen[keyStr]) {
        seen[keyStr] = true;
        result.push(arr[i]);
      }
    }
    
    // Process additional arrays
    for (let i = 0; i < arrays.length; i++) {
      const key = typeof iteratee === 'function' ? iteratee(arrays[i]) : arrays[i][iteratee];
      const keyStr = typeof key === 'object' ? JSON.stringify(key) : String(key);
      if (!seen[keyStr]) {
        seen[keyStr] = true;
        result.push(arrays[i]);
      }
    }
    
    return new this.constructor(result);
  },
  
  unionWith: function(arrays, comparator) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arr = Array.from(this._value);
    const result = [];
    
    // Add all items from first array
    for (let i = 0; i < arr.length; i++) {
      result.push(arr[i]);
    }
    
    // Add items from additional arrays if not already present
    for (let i = 0; i < arrays.length; i++) {
      let shouldAdd = true;
      for (let j = 0; j < result.length; j++) {
        if (comparator(arrays[i], result[j])) {
          shouldAdd = false;
          break;
        }
      }
      if (shouldAdd) {
        result.push(arrays[i]);
      }
    }
    
    return new this.constructor(result);
  },
  
  xor: function(...arrays) {
    const allArrays = [this._value || []].concat(arrays);
    const result = [];
    const counts = {};
    
    // Count occurrences
    for (let i = 0; i < allArrays.length; i++) {
      const arr = Array.from(allArrays[i]);
      const seen = {};
      for (let j = 0; j < arr.length; j++) {
        const key = typeof arr[j] === 'object' ? JSON.stringify(arr[j]) : String(arr[j]);
        if (!seen[key]) {
          seen[key] = true;
          counts[key] = (counts[key] || 0) + 1;
        }
      }
    }
    
    // Add items that appear in exactly one array
    for (let i = 0; i < allArrays.length; i++) {
      const arr = Array.from(allArrays[i]);
      for (let j = 0; j < arr.length; j++) {
        const key = typeof arr[j] === 'object' ? JSON.stringify(arr[j]) : String(arr[j]);
        if (counts[key] === 1) {
          counts[key] = -1; // Mark as added
          result.push(arr[j]);
        }
      }
    }
    
    return new this.constructor(result);
  },
  
  xorBy: function(arrays, iteratee) {
    const allArrays = [this._value || [], arrays];
    const result = [];
    const counts = {};
    const items = {};
    
    // Count occurrences by key
    for (let i = 0; i < allArrays.length; i++) {
      const arr = Array.from(allArrays[i]);
      const seen = {};
      for (let j = 0; j < arr.length; j++) {
        const key = typeof iteratee === 'function' ? iteratee(arr[j]) : arr[j][iteratee];
        const keyStr = typeof key === 'object' ? JSON.stringify(key) : String(key);
        if (!seen[keyStr]) {
          seen[keyStr] = true;
          counts[keyStr] = (counts[keyStr] || 0) + 1;
          if (!items[keyStr]) {
            items[keyStr] = arr[j];
          }
        }
      }
    }
    
    // Add items that appear in exactly one array
    for (const keyStr in counts) {
      if (counts[keyStr] === 1) {
        result.push(items[keyStr]);
      }
    }
    
    return new this.constructor(result);
  },
  
  xorWith: function(arrays, comparator) {
    const allArrays = [this._value || [], arrays];
    const result = [];
    
    for (let i = 0; i < allArrays.length; i++) {
      const arr = Array.from(allArrays[i]);
      for (let j = 0; j < arr.length; j++) {
        let count = 0;
        
        // Count how many arrays contain this item
        for (let k = 0; k < allArrays.length; k++) {
          const otherArr = Array.from(allArrays[k]);
          for (let l = 0; l < otherArr.length; l++) {
            if (comparator(arr[j], otherArr[l])) {
              count++;
              break;
            }
          }
        }
        
        // Add if appears in exactly one array and not already in result
        if (count === 1) {
          let alreadyAdded = false;
          for (let k = 0; k < result.length; k++) {
            if (comparator(arr[j], result[k])) {
              alreadyAdded = true;
              break;
            }
          }
          if (!alreadyAdded) {
            result.push(arr[j]);
          }
        }
      }
    }
    
    return new this.constructor(result);
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
  
  zipObject: function(values) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor({});
    }
    const keys = Array.from(this._value);
    const vals = values || [];
    const result = {};
    for (let i = 0; i < keys.length; i++) {
      result[keys[i]] = vals[i];
    }
    return new this.constructor(result);
  },
  
  zipObjectDeep: function(values) {
    const setDeep = (obj, path, value) => {
      const keys = path.split('.');
      let current = obj;
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key] || typeof current[key] !== 'object') {
          current[key] = {};
        }
        current = current[key];
      }
      current[keys[keys.length - 1]] = value;
    };
    
    if (this._value === null || this._value === undefined) {
      return new this.constructor({});
    }
    const paths = Array.from(this._value);
    const vals = values || [];
    const result = {};
    for (let i = 0; i < paths.length; i++) {
      setDeep(result, paths[i], vals[i]);
    }
    return new this.constructor(result);
  },
  
  unzip: function() {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arrays = Array.from(this._value);
    if (arrays.length === 0) return new this.constructor([]);
    
    const result = [];
    const maxLength = Math.max(...arrays.map(arr => arr ? arr.length : 0));
    
    for (let i = 0; i < maxLength; i++) {
      const group = [];
      for (let j = 0; j < arrays.length; j++) {
        group.push(arrays[j] ? arrays[j][i] : undefined);
      }
      result.push(group);
    }
    return new this.constructor(result);
  },
  
  unzipWith: function(iteratee) {
    if (this._value === null || this._value === undefined) {
      return new this.constructor([]);
    }
    const arrays = Array.from(this._value);
    if (arrays.length === 0) return new this.constructor([]);
    
    const result = [];
    const maxLength = Math.max(...arrays.map(arr => arr ? arr.length : 0));
    
    for (let i = 0; i < maxLength; i++) {
      const group = [];
      for (let j = 0; j < arrays.length; j++) {
        group.push(arrays[j] ? arrays[j][i] : undefined);
      }
      result.push(iteratee(...group));
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
  
  get: function(path, defaultValue) {
    const pathArray = Array.isArray(path) ? path : path.split('.');
    let current = this._value;
    
    for (let i = 0; i < pathArray.length; i++) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return defaultValue;
      }
      current = current[pathArray[i]];
    }
    
    return current === undefined ? defaultValue : current;
  },
  
  set: function(path, value) {
    const pathArray = Array.isArray(path) ? path : path.split('.');
    const obj = this._value && typeof this._value === 'object' ? { ...this._value } : {};
    let current = obj;
    
    for (let i = 0; i < pathArray.length - 1; i++) {
      const key = pathArray[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[pathArray[pathArray.length - 1]] = value;
    return new this.constructor(obj);
  },
  
  has: function(path) {
    const pathArray = Array.isArray(path) ? path : path.split('.');
    let current = this._value;
    
    for (let i = 0; i < pathArray.length; i++) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return false;
      }
      if (!(pathArray[i] in current)) {
        return false;
      }
      current = current[pathArray[i]];
    }
    
    return true;
  },
  
  hasIn: function(path) {
    const pathArray = Array.isArray(path) ? path : path.split('.');
    let current = this._value;
    
    for (let i = 0; i < pathArray.length; i++) {
      if (current === null || current === undefined) {
        return false;
      }
      if (!(pathArray[i] in current)) {
        return false;
      }
      current = current[pathArray[i]];
    }
    
    return true;
  },
  
  mapKeys: function(iteratee) {
    const result = {};
    const obj = this._value;
    
    if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const newKey = typeof iteratee === 'function' ? iteratee(value, key, obj) : value[iteratee];
        result[newKey] = value;
      }
    }
    
    return new this.constructor(result);
  },
  
  mapValues: function(iteratee) {
    const result = {};
    const obj = this._value;
    
    if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        result[key] = typeof iteratee === 'function' ? iteratee(value, key, obj) : value[iteratee];
      }
    }
    
    return new this.constructor(result);
  },
  
  toPairs: function() {
    if (this._value && typeof this._value === 'object') {
      return new this.constructor(Object.entries(this._value));
    }
    return new this.constructor([]);
  },
  
  toPairsIn: function() {
    const result = [];
    if (this._value && typeof this._value === 'object') {
      for (const key in this._value) {
        result.push([key, this._value[key]]);
      }
    }
    return new this.constructor(result);
  },
  
  assignIn: function(...sources) {
    const result = {};
    const objects = [this._value, ...sources];
    
    for (const obj of objects) {
      if (obj && typeof obj === 'object') {
        for (const key in obj) {
          result[key] = obj[key];
        }
      }
    }
    
    return new this.constructor(result);
  },
  
  assignWith: function(customizer, ...sources) {
    const result = { ...this._value };
    
    for (const source of sources) {
      if (source && typeof source === 'object') {
        for (const [key, value] of Object.entries(source)) {
          const customized = customizer(result[key], value, key, result, source);
          result[key] = customized !== undefined ? customized : value;
        }
      }
    }
    
    return new this.constructor(result);
  },
  
  mergeWith: function(customizer, ...sources) {
    const deepMergeWithCustomizer = (target, source, customizer, key) => {
      const customized = customizer(target, source, key);
      if (customized !== undefined) {
        return customized;
      }
      
      if (typeof target === 'object' && typeof source === 'object' && target !== null && source !== null) {
        const result = Array.isArray(target) ? [...target] : { ...target };
        for (const k in source) {
          result[k] = deepMergeWithCustomizer(result[k], source[k], customizer, k);
        }
        return result;
      }
      
      return source;
    };
    
    let result = this._value;
    for (const source of sources) {
      result = deepMergeWithCustomizer(result, source, customizer);
    }
    
    return new this.constructor(result);
  },
  
  at: function(...paths) {
    const result = [];
    const flatPaths = paths.flat();
    
    for (const path of flatPaths) {
      const pathArray = Array.isArray(path) ? path : path.split('.');
      let current = this._value;
      
      for (let i = 0; i < pathArray.length; i++) {
        if (current === null || current === undefined || typeof current !== 'object') {
          current = undefined;
          break;
        }
        current = current[pathArray[i]];
      }
      
      result.push(current);
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
  
  upperCase: function() {
    const str = String(this._value);
    const words = str.match(/[A-Za-z][a-z]*|[0-9]+|[A-Z]+(?=[A-Z][a-z]|\b)/g) || [];
    return new this.constructor(words.map(word => word.toUpperCase()).join(' '));
  },
  
  lowerCase: function() {
    const str = String(this._value);
    const words = str.match(/[A-Za-z][a-z]*|[0-9]+|[A-Z]+(?=[A-Z][a-z]|\b)/g) || [];
    return new this.constructor(words.map(word => word.toLowerCase()).join(' '));
  },
  
  pad: function(length, chars) {
    const str = String(this._value);
    const padChars = chars || ' ';
    const targetLength = Number(length) || 0;
    
    if (str.length >= targetLength) {
      return new this.constructor(str);
    }
    
    const totalPadding = targetLength - str.length;
    const leftPadding = Math.floor(totalPadding / 2);
    const rightPadding = totalPadding - leftPadding;
    
    let leftPad = '';
    let rightPad = '';
    
    // Build left padding
    while (leftPad.length < leftPadding) {
      leftPad += padChars;
    }
    leftPad = leftPad.slice(0, leftPadding);
    
    // Build right padding
    while (rightPad.length < rightPadding) {
      rightPad += padChars;
    }
    rightPad = rightPad.slice(0, rightPadding);
    
    return new this.constructor(leftPad + str + rightPad);
  },
  
  padStart: function(length, chars) {
    const str = String(this._value);
    const padChars = chars || ' ';
    const targetLength = Number(length) || 0;
    
    if (str.length >= targetLength) {
      return new this.constructor(str);
    }
    
    const paddingLength = targetLength - str.length;
    let padding = '';
    
    while (padding.length < paddingLength) {
      padding += padChars;
    }
    padding = padding.slice(0, paddingLength);
    
    return new this.constructor(padding + str);
  },
  
  padEnd: function(length, chars) {
    const str = String(this._value);
    const padChars = chars || ' ';
    const targetLength = Number(length) || 0;
    
    if (str.length >= targetLength) {
      return new this.constructor(str);
    }
    
    const paddingLength = targetLength - str.length;
    let padding = '';
    
    while (padding.length < paddingLength) {
      padding += padChars;
    }
    padding = padding.slice(0, paddingLength);
    
    return new this.constructor(str + padding);
  },
  
  trim: function(chars) {
    const str = String(this._value);
    if (!chars) {
      return new this.constructor(str.trim());
    }
    
    const charSet = chars.split('');
    let start = 0;
    let end = str.length;
    
    // Trim from start
    while (start < str.length && charSet.includes(str[start])) {
      start++;
    }
    
    // Trim from end
    while (end > start && charSet.includes(str[end - 1])) {
      end--;
    }
    
    return new this.constructor(str.slice(start, end));
  },
  
  trimStart: function(chars) {
    const str = String(this._value);
    if (!chars) {
      return new this.constructor(str.trimStart());
    }
    
    const charSet = chars.split('');
    let start = 0;
    
    while (start < str.length && charSet.includes(str[start])) {
      start++;
    }
    
    return new this.constructor(str.slice(start));
  },
  
  trimEnd: function(chars) {
    const str = String(this._value);
    if (!chars) {
      return new this.constructor(str.trimEnd());
    }
    
    const charSet = chars.split('');
    let end = str.length;
    
    while (end > 0 && charSet.includes(str[end - 1])) {
      end--;
    }
    
    return new this.constructor(str.slice(0, end));
  },
  
  truncate: function(options) {
    const str = String(this._value);
    const opts = options || {};
    const length = opts.length || 30;
    const omission = opts.omission || '...';
    const separator = opts.separator;
    
    if (str.length <= length) {
      return new this.constructor(str);
    }
    
    let end = length - omission.length;
    if (end < 1) {
      return new this.constructor(omission);
    }
    
    let result = str.slice(0, end);
    
    if (separator) {
      const sepRegex = typeof separator === 'string' ? new RegExp(separator, 'g') : separator;
      let lastMatch = null;
      let match;
      
      while ((match = sepRegex.exec(result)) !== null) {
        lastMatch = match.index;
      }
      
      if (lastMatch !== null) {
        result = result.slice(0, lastMatch);
      }
    }
    
    return new this.constructor(result + omission);
  },
  
  escape: function() {
    const str = String(this._value);
    const htmlEscapes = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    
    return new this.constructor(str.replace(/[&<>"']/g, match => htmlEscapes[match]));
  },
  
  unescape: function() {
    const str = String(this._value);
    const htmlUnescapes = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'"
    };
    
    return new this.constructor(str.replace(/&(?:amp|lt|gt|quot|#39);/g, match => htmlUnescapes[match]));
  },
  
  words: function(pattern) {
    const str = String(this._value);
    const regex = pattern || /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g;
    return new this.constructor(str.match(regex) || []);
  },
  
  deburr: function() {
    const str = String(this._value);
    const deburredLetters = {
      'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A',
      'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a',
      'Ç': 'C', 'ç': 'c',
      'Ð': 'D', 'ð': 'd',
      'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
      'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
      'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
      'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
      'Ñ': 'N', 'ñ': 'n',
      'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O', 'Ø': 'O',
      'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ø': 'o',
      'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U',
      'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
      'Ý': 'Y', 'ý': 'y', 'ÿ': 'y',
      'Æ': 'Ae', 'æ': 'ae',
      'Þ': 'Th', 'þ': 'th',
      'ß': 'ss'
    };
    
    return new this.constructor(str.replace(/[À-ÿ]/g, match => deburredLetters[match] || match));
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
  },
  
  // Function utilities
  debounce: function(wait, options) {
    const func = this._value;
    if (typeof func !== 'function') {
      throw new TypeError('Expected a function');
    }
    
    wait = Number(wait) || 0;
    const opts = options || {};
    const leading = !!opts.leading;
    const trailing = opts.trailing !== false;
    const maxing = 'maxWait' in opts;
    const maxWait = maxing ? Math.max(Number(opts.maxWait) || 0, wait) : null;
    
    let lastCallTime;
    let lastInvokeTime = 0;
    let timerId;
    let lastArgs;
    let lastThis;
    let result;
    
    function invokeFunc(time) {
      const args = lastArgs;
      const thisArg = lastThis;
      
      lastArgs = lastThis = undefined;
      lastInvokeTime = time;
      result = func.apply(thisArg, args);
      return result;
    }
    
    function leadingEdge(time) {
      lastInvokeTime = time;
      timerId = setTimeout(timerExpired, wait);
      return leading ? invokeFunc(time) : result;
    }
    
    function remainingWait(time) {
      const timeSinceLastCall = time - lastCallTime;
      const timeSinceLastInvoke = time - lastInvokeTime;
      const timeWaiting = wait - timeSinceLastCall;
      
      return maxing
        ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
        : timeWaiting;
    }
    
    function shouldInvoke(time) {
      const timeSinceLastCall = time - lastCallTime;
      const timeSinceLastInvoke = time - lastInvokeTime;
      
      return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
        (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
    }
    
    function timerExpired() {
      const time = Date.now();
      if (shouldInvoke(time)) {
        return trailingEdge(time);
      }
      timerId = setTimeout(timerExpired, remainingWait(time));
    }
    
    function trailingEdge(time) {
      timerId = undefined;
      
      if (trailing && lastArgs) {
        return invokeFunc(time);
      }
      lastArgs = lastThis = undefined;
      return result;
    }
    
    function cancel() {
      if (timerId !== undefined) {
        clearTimeout(timerId);
      }
      lastInvokeTime = 0;
      lastArgs = lastCallTime = lastThis = timerId = undefined;
    }
    
    function flush() {
      return timerId === undefined ? result : trailingEdge(Date.now());
    }
    
    function debounced() {
      const time = Date.now();
      const isInvoking = shouldInvoke(time);
      
      lastArgs = arguments;
      lastThis = this;
      lastCallTime = time;
      
      if (isInvoking) {
        if (timerId === undefined) {
          return leadingEdge(lastCallTime);
        }
        if (maxing) {
          clearTimeout(timerId);
          timerId = setTimeout(timerExpired, wait);
          return invokeFunc(lastCallTime);
        }
      }
      if (timerId === undefined) {
        timerId = setTimeout(timerExpired, wait);
      }
      return result;
    }
    
    debounced.cancel = cancel;
    debounced.flush = flush;
    return debounced;
  },
  
  throttle: function(wait, options) {
    const func = this._value;
    if (typeof func !== 'function') {
      throw new TypeError('Expected a function');
    }
    
    const leading = options && options.leading !== false;
    const trailing = options && options.trailing !== false;
    
    return this.debounce(wait, {
      leading: leading,
      maxWait: wait,
      trailing: trailing
    });
  },
  
  curry: function(arity) {
    const func = this._value;
    if (typeof func !== 'function') {
      throw new TypeError('Expected a function');
    }
    
    const n = arity !== undefined ? arity : func.length;
    
    function curried() {
      const args = Array.from(arguments);
      if (args.length >= n) {
        return func.apply(this, args);
      }
      return function() {
        return curried.apply(this, args.concat(Array.from(arguments)));
      };
    }
    
    return curried;
  },
  
  curryRight: function(arity) {
    const func = this._value;
    if (typeof func !== 'function') {
      throw new TypeError('Expected a function');
    }
    
    const n = arity !== undefined ? arity : func.length;
    
    function curried() {
      const args = Array.from(arguments);
      if (args.length >= n) {
        return func.apply(this, args);
      }
      return function() {
        return curried.apply(this, Array.from(arguments).concat(args));
      };
    }
    
    return curried;
  },
  
  partial: function(...partials) {
    const func = this._value;
    if (typeof func !== 'function') {
      throw new TypeError('Expected a function');
    }
    
    return function() {
      const args = [];
      let partialIndex = 0;
      let argIndex = 0;
      
      for (let i = 0; i < partials.length; i++) {
        args.push(partials[i]);
      }
      
      for (let i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
      }
      
      return func.apply(this, args);
    };
  },
  
  partialRight: function(...partials) {
    const func = this._value;
    if (typeof func !== 'function') {
      throw new TypeError('Expected a function');
    }
    
    return function() {
      const args = Array.from(arguments);
      for (let i = 0; i < partials.length; i++) {
        args.push(partials[i]);
      }
      return func.apply(this, args);
    };
  },
  
  memoize: function(resolver) {
    const func = this._value;
    if (typeof func !== 'function') {
      throw new TypeError('Expected a function');
    }
    
    const memoized = function() {
      const key = resolver ? resolver.apply(this, arguments) : arguments[0];
      const cache = memoized.cache;
      
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = func.apply(this, arguments);
      memoized.cache = cache.set(key, result) || cache;
      return result;
    };
    
    memoized.cache = new Map();
    return memoized;
  },
  
  once: function() {
    const func = this._value;
    if (typeof func !== 'function') {
      throw new TypeError('Expected a function');
    }
    
    let called = false;
    let result;
    
    return function() {
      if (!called) {
        called = true;
        result = func.apply(this, arguments);
      }
      return result;
    };
  },
  
  flow: function(...funcs) {
    const firstFunc = this._value;
    if (typeof firstFunc !== 'function') {
      throw new TypeError('Expected a function');
    }
    
    const allFuncs = [firstFunc, ...funcs];
    
    return function() {
      let result = allFuncs[0].apply(this, arguments);
      for (let i = 1; i < allFuncs.length; i++) {
        result = allFuncs[i].call(this, result);
      }
      return result;
    };
  },
  
  flowRight: function(...funcs) {
    const lastFunc = this._value;
    if (typeof lastFunc !== 'function') {
      throw new TypeError('Expected a function');
    }
    
    const allFuncs = [...funcs, lastFunc];
    
    return function() {
      let result = allFuncs[allFuncs.length - 1].apply(this, arguments);
      for (let i = allFuncs.length - 2; i >= 0; i--) {
        result = allFuncs[i].call(this, result);
      }
      return result;
    };
  }
};
`;
