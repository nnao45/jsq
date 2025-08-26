// 共通メソッドのインターフェース定義
// $記法とlodash記法の両方で実装すべきメソッドを定義

export interface ArrayMethods<T> {
  // 基本的な配列操作
  filter(predicate: (value: T, index: number, array: T[]) => boolean): ArrayMethods<T>;
  map<U>(mapper: (value: T, index: number, array: T[]) => U): ArrayMethods<U>;
  find(predicate: (value: T, index: number, array: T[]) => boolean): T | undefined;
  reduce<U>(reducer: (acc: U, value: T, index: number, array: T[]) => U, initial?: U): U;

  // 高度な配列操作
  where(properties: Partial<T>): ArrayMethods<T>;
  pluck<K extends keyof T>(key: K): ArrayMethods<T[K]>;
  sortBy<K extends keyof T>(key: K | ((item: T) => unknown)): ArrayMethods<T>;
  orderBy<K extends keyof T>(
    keys: K | K[] | ((item: T) => unknown) | ((item: T) => unknown)[],
    orders?: ('asc' | 'desc') | ('asc' | 'desc')[]
  ): ArrayMethods<T>;
  groupBy<K extends keyof T>(key: K | ((item: T) => string | number)): Record<string, T[]>;
  countBy<K extends keyof T>(key: K | ((item: T) => string | number)): Record<string, number>;
  keyBy<K extends keyof T>(key: K | ((item: T) => string | number)): Record<string, T>;

  // セレクタ系
  take(n: number): ArrayMethods<T>;
  skip(n: number): ArrayMethods<T>;
  takeWhile(predicate: (value: T, index: number, array: T[]) => boolean): ArrayMethods<T>;
  dropWhile(predicate: (value: T, index: number, array: T[]) => boolean): ArrayMethods<T>;

  // ユニーク・サンプリング
  uniqBy<K extends keyof T>(key: K | ((item: T) => unknown)): ArrayMethods<T>;
  sample(): T | undefined;
  sampleSize(n: number): ArrayMethods<T>;
  shuffle(): ArrayMethods<T>;

  // 変換系
  flatten(): ArrayMethods<T extends (infer U)[] ? U : T>;
  flattenDeep(): ArrayMethods<unknown>;
  compact(): ArrayMethods<NonNullable<T>>;
  chunk(size: number): ArrayMethods<T[]>;
  reverse(): ArrayMethods<T>;

  // 数学・統計系
  sum(): number;
  mean(): number;
  min(): T | undefined;
  max(): T | undefined;
  minBy<K extends keyof T>(key: K | ((item: T) => number)): T | undefined;
  maxBy<K extends keyof T>(key: K | ((item: T) => number)): T | undefined;

  // ユーティリティ
  size(): number;
  isEmpty(): boolean;
  includes(value: T): boolean;

  // オブジェクト系（配列要素がオブジェクトの場合）
  entries(): ArrayMethods<[string, unknown]>;
  keys(): ArrayMethods<string>;
  values(): ArrayMethods<unknown>;
}

export interface AsyncMethods<T> {
  // 非同期メソッド
  mapAsync<U>(
    mapper: (value: T, index: number, array: T[]) => Promise<U>
  ): Promise<ArrayMethods<U>>;
  mapAsyncSeq<U>(
    mapper: (value: T, index: number, array: T[]) => Promise<U>
  ): Promise<ArrayMethods<U>>;
  forEachAsync(callback: (value: T, index: number, array: T[]) => Promise<void>): Promise<void>;
  forEachAsyncSeq(callback: (value: T, index: number, array: T[]) => Promise<void>): Promise<void>;
}

export interface ObjectMethods<T> {
  // オブジェクト操作
  pick<K extends keyof T>(...keys: K[]): Pick<T, K>;
  omit<K extends keyof T>(...keys: K[]): Omit<T, K>;
  invert(): Record<string, string>;
  merge(...sources: Partial<T>[]): T;
  defaults(...sources: Partial<T>[]): T;
}

export interface StringMethods {
  // 文字列操作（lodash特有）
  camelCase(): string;
  kebabCase(): string;
  snakeCase(): string;
  startCase(): string;
  upperFirst(): string;
  lowerFirst(): string;
  capitalize(): string;
}

export interface UtilityMethods {
  // ユーティリティメソッド
  identity<T>(value: T): T;
  constant<T>(value: T): () => T;
  noop(): void;
  times<T>(n: number, iteratee: (index: number) => T): T[];
  range(start: number, end?: number, step?: number): number[];
  clamp(number: number, lower: number, upper: number): number;
  random(lower?: number, upper?: number, floating?: boolean): number;
}

// $記法用の統合インターフェース
export interface SmartDollarMethods<T> extends ArrayMethods<T>, AsyncMethods<T> {
  // $記法特有のメソッド
  chain(): SmartDollarMethods<T>; // lodashスタイルのチェーン
}

// lodash記法用の統合インターフェース
export interface LodashMethods<T>
  extends ArrayMethods<T>,
    ObjectMethods<T>,
    StringMethods,
    UtilityMethods {
  // lodash特有のメソッド
  chain<U>(value: U): LodashMethods<U>;
  debounce<F extends (...args: unknown[]) => unknown>(func: F, wait: number): F;
  throttle<F extends (...args: unknown[]) => unknown>(func: F, wait: number): F;
  fromPairs<V>(pairs: [string, V][]): Record<string, V>;
}

// VMとnon-VMで共通の実装を強制するための型
export type MethodImplementation<T> = {
  [K in keyof T]: T[K];
};

// メソッドのテストケース用の型
export interface MethodTestCase<Input, Output> {
  method: string;
  input: Input;
  args: unknown[];
  expected: Output;
  description: string;
}
