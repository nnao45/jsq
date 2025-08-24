// 共通メソッドのインターフェース定義
// $記法とlodash記法の両方で実装すべきメソッドを定義

export interface ArrayMethods<T> {
  // 基本的な配列操作
  filter(predicate: (value: T, index: number, array: T[]) => boolean): any;
  map<U>(mapper: (value: T, index: number, array: T[]) => U): any;
  find(predicate: (value: T, index: number, array: T[]) => boolean): T | undefined;
  reduce<U>(reducer: (acc: U, value: T, index: number, array: T[]) => U, initial?: U): U;

  // 高度な配列操作
  where(properties: Partial<T>): any;
  pluck<K extends keyof T>(key: K): any;
  sortBy<K extends keyof T>(key: K | ((item: T) => any)): any;
  orderBy<K extends keyof T>(
    keys: K | K[] | ((item: T) => any) | ((item: T) => any)[],
    orders?: ('asc' | 'desc') | ('asc' | 'desc')[]
  ): any;
  groupBy<K extends keyof T>(key: K | ((item: T) => any)): any;
  countBy<K extends keyof T>(key: K | ((item: T) => any)): any;
  keyBy<K extends keyof T>(key: K | ((item: T) => any)): any;

  // セレクタ系
  take(n: number): any;
  skip(n: number): any;
  takeWhile(predicate: (value: T, index: number, array: T[]) => boolean): any;
  dropWhile(predicate: (value: T, index: number, array: T[]) => boolean): any;

  // ユニーク・サンプリング
  uniqBy<K extends keyof T>(key: K | ((item: T) => any)): any;
  sample(): T | undefined;
  sampleSize(n: number): any;
  shuffle(): any;

  // 変換系
  flatten(): any;
  flattenDeep(): any;
  compact(): any;
  chunk(size: number): any;
  reverse(): any;

  // 数学・統計系
  sum(): number;
  mean(): number;
  min(): T | undefined;
  max(): T | undefined;
  minBy<K extends keyof T>(key: K | ((item: T) => any)): T | undefined;
  maxBy<K extends keyof T>(key: K | ((item: T) => any)): T | undefined;

  // ユーティリティ
  size(): number;
  isEmpty(): boolean;
  includes(value: T): boolean;

  // オブジェクト系（配列要素がオブジェクトの場合）
  entries(): any;
  keys(): any;
  values(): any;
}

export interface AsyncMethods<T> {
  // 非同期メソッド
  mapAsync<U>(mapper: (value: T, index: number, array: T[]) => Promise<U>): Promise<any>;
  mapAsyncSeq<U>(mapper: (value: T, index: number, array: T[]) => Promise<U>): Promise<any>;
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
  chain(): any; // lodashスタイルのチェーン
}

// lodash記法用の統合インターフェース
export interface LodashMethods<T>
  extends ArrayMethods<T>,
    ObjectMethods<T>,
    StringMethods,
    UtilityMethods {
  // lodash特有のメソッド
  chain<U>(value: U): any;
  debounce(func: Function, wait: number): Function;
  throttle(func: Function, wait: number): Function;
  fromPairs(pairs: [string, any][]): Record<string, any>;
}

// VMとnon-VMで共通の実装を強制するための型
export type MethodImplementation<T> = {
  [K in keyof T]: T[K];
};

// メソッドのテストケース用の型
export interface MethodTestCase<Input, Output> {
  method: string;
  input: Input;
  args: any[];
  expected: Output;
  description: string;
}
