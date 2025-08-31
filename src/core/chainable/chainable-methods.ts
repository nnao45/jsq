export // List of ChainableWrapper methods that should trigger chainable behavior
const CHAINABLE_METHODS = [
  // Core methods
  'map',
  'filter',
  'find',
  'reduce',
  'groupBy',
  'sortBy',
  'orderBy',
  'slice',
  'flatten',
  'flattenDeep',
  'flatMap',
  'uniq',
  'uniqBy',
  'compact',
  'chunk',
  'pluck',
  'where',
  'findWhere',
  'first',
  'last',
  'take',
  'takeWhile',
  'drop',
  'dropWhile',
  'skip',
  'sample',
  'sampleSize',
  'shuffle',
  'reverse',
  'keys',
  'values',
  'entries',
  'pick',
  'omit',
  'invert',
  'defaults',
  'merge',
  'extend',
  'mapValues',
  'clone',
  'has',
  'includes',
  'get',
  'set',
  'sum',
  'mean',
  'min',
  'minBy',
  'max',
  'maxBy',
  'count',
  'countBy',
  'keyBy',
  'size',
  // 'length' is excluded because it conflicts with array.length property
  'isEmpty',
  'isArray',
  'isObject',
  'isString',
  'isNumber',
  'toArray',

  // Advanced collection methods (Tier 1)
  'partition',
  'windowed',
  'chunked',
  'span',
  'takeUntil',
  'dropUntil',

  // Advanced collection methods (Tier 2)
  'frequencies',
  'groupWith',
  'reduceBy',
  'scanLeft',
  'distinctBy',
  'intersectBy',

  // Advanced collection methods (Tier 3)
  'spy',
  'filterMap',
  'findLast',
  'quantify',
  'pairwise',
  'intersperse',

  // Advanced collection methods (Tier 4)
  'peekable',
  'batched',

  // Functional programming methods
  'fold',
  'foldLeft',
  'foldRight',
  'traverse',
  'scan',
  'scanRight',

  // Reactive/Async methods (RxJS-style operators)
  // Time-based operators
  'delay',
  'debounceTime',
  'throttleTime',
  'timeout',
  'interval',
  'timer',

  // Advanced transformation operators
  'concatMap',
  'mergeMap',
  'switchMap',
  'exhaustMap',

  // Enhanced filtering operators
  'distinctUntilChanged',
  'skipLast',
  'takeLast',

  // Stream combination operators
  'combineLatest',
  'zip',
  'zipWith',
  'unzip',
  'merge',

  // Error handling operators
  'retry',
  'catchError',

  // Utility operators
  'tap', // Note: this is the RxJS-style tap, different from spy
  'startWith',

  // Standard iteration methods
  'forEach',
  'each',

  // Async iteration methods
  'forEachAsync',
  'forEachAsyncSeq',
  'mapAsync',
  'mapAsyncSeq',
  
  // Haskell-style methods
  'head',
  'tail',
  'init',
  'last',
  'cons',
  'snoc',
  'breakAt',
  'iterate',
  'unfold',
  
  // Modern utility methods
  'cycle',
  'intercalate',
  'transpose',
  'tee',
  'debug',
  'benchmark',
  'memoize',
  'partitionBy',
  'sliding',
  'enumerate',
  'groupByMultiple',
];
