# Smart Dollar Methods Comparison

## Methods Implemented but NOT Documented

### Array Methods
- **concat(...args)** - Concatenates arrays or values
- **push(...elements)** - Adds elements to the end of array (mutating)
- **pop()** - Removes and returns last element (mutating)
- **shift()** - Removes and returns first element (mutating)
- **unshift(...elements)** - Adds elements to beginning (mutating)
- **splice(start, deleteCount, ...items)** - Changes array contents (mutating)
- **some(fn)** - Tests if any element passes the predicate
- **every(fn)** - Tests if all elements pass the predicate
- **includes(searchElement, fromIndex)** - Checks if array includes an element
- **indexOf(searchElement, fromIndex)** - Returns first index of element
- **lastIndexOf(searchElement, fromIndex)** - Returns last index of element
- **findIndex(predicate, thisArg)** - Returns index of first element matching predicate
- **join(separator)** - Joins array elements into string
- **reverse()** - Reverses array in place
- **sort(compareFn)** - Sorts array in place
- **slice(start, end)** - Returns shallow copy of portion of array
- **flatMap(fn)** - Maps and flattens result by one level

### String Methods (Not documented at all)
- **split(separator, limit)** - Splits string into array
- **replace(search, replacement)** - Replaces first occurrence
- **replaceAll(search, replacement)** - Replaces all occurrences
- **toLowerCase()** - Converts to lowercase
- **toUpperCase()** - Converts to uppercase
- **trim()** - Removes whitespace from both ends
- **substring(start, end)** - Returns substring
- **charAt(index)** - Returns character at index
- **charCodeAt(index)** - Returns Unicode of character
- **startsWith(searchString, position)** - Checks if string starts with substring
- **endsWith(searchString, position)** - Checks if string ends with substring
- **padStart(targetLength, padString)** - Pads string from start
- **padEnd(targetLength, padString)** - Pads string from end
- **match(regexp)** - Matches against regular expression
- **search(regexp)** - Searches for match with regexp

### Number Methods (Not documented at all)
- **toFixed(digits)** - Formats number with fixed decimal places
- **toExponential(fractionDigits)** - Returns exponential notation
- **toPrecision(precision)** - Formats number to specified precision

### Type Conversion Methods (Not documented)
- **toString()** - Converts to string
- **toNumber()** - Converts to number
- **toBoolean()** - Converts to boolean
- **toArray()** - Converts to array

### Object Methods (Missing from docs)
- **hasOwn(prop)** - Checks if object has own property

### Utility Methods (Missing from docs)
- **value()** - Returns the wrapped value
- **valueOf()** - Returns primitive value
- **isNull()** - Checks if value is null
- **isUndefined()** - Checks if value is undefined
- **isNullOrUndefined()** - Checks if value is null or undefined
- **when(condition, trueFn, falseFn)** - Conditional chaining
- **unless(condition, fn)** - Reverse conditional chaining

### Collection Methods (Missing from docs)
- **countBy(iteratee)** - Counts occurrences by iteratee result
- **take(n)** - Takes first n elements
- **skip(n)** - Skips first n elements
- **keyBy(iteratee)** - Creates object keyed by iteratee result
- **takeWhile(predicate)** - Takes elements while predicate is true
- **dropWhile(predicate)** - Drops elements while predicate is true
- **size()** - Returns size of collection

### Mathematical Methods (Missing from docs)
- **min()** - Returns minimum value
- **max()** - Returns maximum value

### Functional Programming Methods (Not documented at all)
- **fold(fn, initial)** - Left-associative fold (alias for reduce)
- **foldLeft(fn, initial)** - Left-associative fold
- **foldRight(fn, initial)** - Right-associative fold
- **scan(fn, initial)** - Returns all intermediate fold results
- **scanLeft(fn, initial)** - Left scan
- **scanRight(fn, initial)** - Right scan
- **zip(other)** - Combines two arrays into array of pairs
- **zipWith(other, fn)** - Zip with custom combining function
- **unzip()** - Converts array of pairs into two arrays
- **intersperse(separator)** - Inserts separator between elements
- **sliding(size, step)** - Creates sliding windows over array
- **windows(size, step)** - Alias for sliding
- **enumerate()** - Adds index to each element as [index, value]

### Haskell-style Methods (Not documented at all)
- **head()** - Returns first element
- **tail()** - Returns all elements except first
- **init()** - Returns all elements except last
- **last()** - Returns last element
- **cons(element)** - Prepends element to list
- **snoc(element)** - Appends element to list
- **span(predicate)** - Splits at first element not matching predicate
- **breakAt(predicate)** - Splits at first element matching predicate
- **iterate(fn, times)** - Generates array by repeated application
- **unfold(fn, seed)** - Generates array from seed value

### Modern Utility Methods (Not documented at all)
- **cycle(times)** - Repeats array elements n times
- **intercalate(separator)** - Joins array of arrays with separator
- **transpose()** - Transposes matrix (array of arrays)
- **distinctBy(keyFn)** - Removes duplicates by key function
- **groupByMultiple(...keyFns)** - Groups by multiple key functions
- **tee(...fns)** - Splits into multiple branches
- **debug(label)** - Logs value for debugging chains
- **benchmark(fn, label)** - Measures execution time
- **memoize(fn, keyFn)** - Creates memoized version of function
- **partitionBy(...predicates)** - Partitions by multiple predicates

## Methods Documented but NOT Implemented
- **pick(keys)** - Select specific object keys
- **omit(keys)** - Exclude specific object keys

## Summary
- **Total Implemented Methods**: 115
- **Total Documented Methods**: 41
- **Methods Missing Documentation**: 74
- **Methods Missing Implementation**: 2 (pick, omit)