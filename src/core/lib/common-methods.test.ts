import { describe, expect, it } from '@jest/globals';
import type { MethodTestCase } from '../../types/common-methods';
import { _ } from '../lodash/lodash-non-vm';
import { type ChainableWrapper, createSmartDollar } from '../smart-dollar/smart-dollar-non-vm';

/**
 * 共通メソッドのテストスイート
 * $記法とlodash記法の両方で同じ動作をすることを保証する
 */

// テストデータ
const testData = {
  numbers: [1, 2, 3, 4, 5],
  objects: [
    { id: 1, name: 'Alice', age: 25, city: 'Tokyo' },
    { id: 2, name: 'Bob', age: 30, city: 'Osaka' },
    { id: 3, name: 'Charlie', age: 25, city: 'Tokyo' },
    { id: 4, name: 'David', age: 35, city: 'Kyoto' },
    { id: 5, name: 'Eve', age: 30, city: 'Tokyo' },
  ],
  nested: [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ],
  deepNested: [1, [2, [3, [4, [5]]]]],
  mixed: [1, null, 2, undefined, 3, false, 0, '', 4],
  duplicates: [1, 2, 2, 3, 3, 3, 4, 5, 5],
};

// 共通メソッドのテストケース
const commonTestCases: MethodTestCase<any, any>[] = [
  // filter
  {
    method: 'filter',
    input: testData.numbers,
    args: [(n: number) => n > 3],
    expected: [4, 5],
    description: '数値配列のフィルタリング',
  },
  {
    method: 'filter',
    input: testData.objects,
    args: [(obj: any) => obj.age >= 30],
    expected: testData.objects.filter(obj => obj.age >= 30),
    description: 'オブジェクト配列のフィルタリング',
  },

  // map
  {
    method: 'map',
    input: testData.numbers,
    args: [(n: number) => n * 2],
    expected: [2, 4, 6, 8, 10],
    description: '数値配列のマッピング',
  },
  {
    method: 'map',
    input: testData.objects,
    args: [(obj: any) => obj.name],
    expected: ['Alice', 'Bob', 'Charlie', 'David', 'Eve'],
    description: 'オブジェクト配列から特定プロパティの抽出',
  },

  // find
  {
    method: 'find',
    input: testData.numbers,
    args: [(n: number) => n > 3],
    expected: 4,
    description: '条件に合う最初の要素を見つける',
  },
  {
    method: 'find',
    input: testData.objects,
    args: [(obj: any) => obj.city === 'Osaka'],
    expected: testData.objects[1],
    description: 'オブジェクト配列から条件に合う要素を見つける',
  },

  // reduce
  {
    method: 'reduce',
    input: testData.numbers,
    args: [(acc: number, n: number) => acc + n, 0],
    expected: 15,
    description: '数値配列の合計',
  },

  // where
  {
    method: 'where',
    input: testData.objects,
    args: [{ city: 'Tokyo' }],
    expected: testData.objects.filter(obj => obj.city === 'Tokyo'),
    description: 'プロパティマッチによるフィルタリング',
  },

  // pluck
  {
    method: 'pluck',
    input: testData.objects,
    args: ['name'],
    expected: ['Alice', 'Bob', 'Charlie', 'David', 'Eve'],
    description: 'プロパティ値の抽出',
  },

  // sortBy
  {
    method: 'sortBy',
    input: testData.objects,
    args: ['age'],
    expected: [
      testData.objects[0], // Alice, 25
      testData.objects[2], // Charlie, 25
      testData.objects[1], // Bob, 30
      testData.objects[4], // Eve, 30
      testData.objects[3], // David, 35
    ],
    description: 'プロパティによるソート',
  },

  // groupBy
  {
    method: 'groupBy',
    input: testData.objects,
    args: ['city'],
    expected: {
      Tokyo: [testData.objects[0], testData.objects[2], testData.objects[4]],
      Osaka: [testData.objects[1]],
      Kyoto: [testData.objects[3]],
    },
    description: 'プロパティによるグループ化',
  },

  // countBy
  {
    method: 'countBy',
    input: testData.objects,
    args: ['city'],
    expected: { Tokyo: 3, Osaka: 1, Kyoto: 1 },
    description: 'プロパティによるカウント',
  },

  // take
  {
    method: 'take',
    input: testData.numbers,
    args: [3],
    expected: [1, 2, 3],
    description: '最初のn個の要素を取得',
  },

  // skip
  {
    method: 'skip',
    input: testData.numbers,
    args: [3],
    expected: [4, 5],
    description: '最初のn個の要素をスキップ',
  },

  // uniqBy
  {
    method: 'uniqBy',
    input: testData.objects,
    args: ['age'],
    expected: [
      testData.objects[0], // age: 25
      testData.objects[1], // age: 30
      testData.objects[3], // age: 35
    ],
    description: 'プロパティによる重複排除',
  },

  // flatten
  {
    method: 'flatten',
    input: testData.nested,
    args: [],
    expected: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    description: '1階層のフラット化',
  },

  // compact
  {
    method: 'compact',
    input: testData.mixed,
    args: [],
    expected: [1, 2, 3, 4],
    description: 'falsy値の除去',
  },

  // chunk
  {
    method: 'chunk',
    input: testData.numbers,
    args: [2],
    expected: [[1, 2], [3, 4], [5]],
    description: '配列のチャンク分割',
  },

  // sum
  {
    method: 'sum',
    input: testData.numbers,
    args: [],
    expected: 15,
    description: '数値配列の合計',
  },

  // mean
  {
    method: 'mean',
    input: testData.numbers,
    args: [],
    expected: 3,
    description: '数値配列の平均',
  },

  // size
  {
    method: 'size',
    input: testData.numbers,
    args: [],
    expected: 5,
    description: '配列のサイズ',
  },

  // isEmpty
  {
    method: 'isEmpty',
    input: [],
    args: [],
    expected: true,
    description: '空配列の判定',
  },

  // includes
  {
    method: 'includes',
    input: testData.numbers,
    args: [3],
    expected: true,
    description: '要素の存在確認',
  },

  // orderBy
  {
    method: 'orderBy',
    input: testData.objects,
    args: [
      ['age', 'name'],
      ['asc', 'desc'],
    ],
    expected: [
      testData.objects[2], // Charlie, 25
      testData.objects[0], // Alice, 25
      testData.objects[4], // Eve, 30
      testData.objects[1], // Bob, 30
      testData.objects[3], // David, 35
    ],
    description: '複数プロパティによる並び替え',
  },

  // keyBy
  {
    method: 'keyBy',
    input: testData.objects,
    args: ['id'],
    expected: {
      '1': testData.objects[0],
      '2': testData.objects[1],
      '3': testData.objects[2],
      '4': testData.objects[3],
      '5': testData.objects[4],
    },
    description: 'プロパティをキーとしたオブジェクトに変換',
  },

  // takeWhile
  {
    method: 'takeWhile',
    input: testData.numbers,
    args: [(n: number) => n < 4],
    expected: [1, 2, 3],
    description: '条件を満たす間の要素を取得',
  },

  // dropWhile
  {
    method: 'dropWhile',
    input: testData.numbers,
    args: [(n: number) => n < 3],
    expected: [3, 4, 5],
    description: '条件を満たす間の要素をスキップ',
  },

  // min
  {
    method: 'min',
    input: testData.numbers,
    args: [],
    expected: 1,
    description: '最小値の取得',
  },

  // max
  {
    method: 'max',
    input: testData.numbers,
    args: [],
    expected: 5,
    description: '最大値の取得',
  },

  // minBy
  {
    method: 'minBy',
    input: testData.objects,
    args: [(obj: any) => obj.age],
    expected: testData.objects[0], // Alice, age: 25
    description: 'プロパティに基づく最小値の取得',
  },

  // maxBy
  {
    method: 'maxBy',
    input: testData.objects,
    args: ['age'],
    expected: testData.objects[3], // David, age: 35
    description: 'プロパティに基づく最大値の取得',
  },

  // flattenDeep
  {
    method: 'flattenDeep',
    input: testData.deepNested,
    args: [],
    expected: [1, 2, 3, 4, 5],
    description: '深い階層のフラット化',
  },

  // reverse
  {
    method: 'reverse',
    input: [...testData.numbers], // コピーを渡す
    args: [],
    expected: [5, 4, 3, 2, 1],
    description: '配列の反転',
  },
];

describe('共通メソッドの一貫性テスト', () => {
  describe('$記法とlodash記法の比較', () => {
    commonTestCases.forEach(testCase => {
      it(`${testCase.method}: ${testCase.description}`, () => {
        // Create separate copies for each test to avoid mutation issues
        const $inputData = Array.isArray(testCase.input) ? [...testCase.input] : testCase.input;
        const lodashInputData = Array.isArray(testCase.input)
          ? [...testCase.input]
          : testCase.input;

        // $記法でのテスト
        const $input = createSmartDollar($inputData);
        const $result = ($input as any)[testCase.method](...testCase.args);

        // Check if result is a ChainableWrapper instance (has _value property)
        const $value =
          $result && $result._value !== undefined
            ? $result._value
            : $result && typeof $result.value === 'function'
              ? $result.value()
              : $result && typeof $result.toJSON === 'function'
                ? $result.toJSON()
                : $result;

        // lodash記法でのテスト
        const lodashResult = (_ as any)[testCase.method](lodashInputData, ...testCase.args);

        // 結果の比較
        expect($value).toEqual(testCase.expected);
        expect(lodashResult).toEqual(testCase.expected);

        // 両方の結果が同じであることを確認
        expect($value).toEqual(lodashResult);
      });
    });
  });

  describe('チェーンメソッドの一貫性', () => {
    it('$記法とlodash記法でチェーンが同じ結果を返す', () => {
      const input = testData.objects;

      // $記法でのチェーン
      const $result = createSmartDollar(input)
        .filter((obj: any) => obj.age >= 30)
        .sortBy('name')
        .map((obj: any) => obj.name)
        .value();

      // lodash記法でのチェーン
      const lodashResult = _.chain(input)
        .filter((obj: any) => obj.age >= 30)
        .sortBy('name')
        .map((obj: any) => obj.name)
        .value();

      expect($result).toEqual(lodashResult);
      expect($result).toEqual(['Bob', 'David', 'Eve']);
    });
  });

  describe('エッジケースのテスト', () => {
    it('空配列での動作', () => {
      const empty: any[] = [];

      // $記法
      const $empty = createSmartDollar(empty);
      expect($empty.filter((x: any) => x > 0).value()).toEqual([]);
      expect($empty.map((x: any) => x * 2).value()).toEqual([]);
      expect($empty.size()).toBe(0);
      expect($empty.isEmpty()).toBe(true);

      // lodash記法
      expect(_.filter(empty, (x: any) => x > 0)).toEqual([]);
      expect(_.map(empty, (x: any) => x * 2)).toEqual([]);
      expect(_.size(empty)).toBe(0);
      expect(_.isEmpty(empty)).toBe(true);
    });

    it('null/undefined要素の処理', () => {
      const mixedArray = [1, null, 2, undefined, 3];

      // $記法
      const $mixed = createSmartDollar(mixedArray);
      expect($mixed.compact().value()).toEqual([1, 2, 3]);

      // lodash記法
      expect(_.compact(mixedArray)).toEqual([1, 2, 3]);
    });
  });

  describe('型安全性のテスト', () => {
    it('TypeScriptの型推論が正しく動作する', () => {
      const numbers: number[] = [1, 2, 3, 4, 5];

      // $記法
      const $numbers = createSmartDollar(numbers);
      const doubled: ChainableWrapper = $numbers.map(n => n * 2);
      const sum: number = $numbers.sum();

      // lodash記法
      const lodashDoubled: number[] = _.map(numbers, n => n * 2);
      const lodashSum: number = _.sum(numbers);

      // 型チェック（コンパイル時に確認される）
      expect(doubled.value()).toEqual(lodashDoubled);
      expect(sum).toEqual(lodashSum);
    });
  });

  describe('ランダム性のあるメソッドのテスト', () => {
    it('sample: ランダムに1つの要素を選択', () => {
      const input = testData.numbers;

      // $記法
      const $sample = createSmartDollar(input).sample();
      expect(input).toContain($sample);

      // lodash記法
      const lodashSample = _.sample(input);
      expect(input).toContain(lodashSample);
    });

    it('sampleSize: ランダムにn個の要素を選択', () => {
      const input = testData.numbers;
      const size = 3;

      // $記法
      const $samples = createSmartDollar(input).sampleSize(size).value();
      expect($samples).toHaveLength(size);
      $samples.forEach((item: number) => {
        expect(input).toContain(item);
      });

      // lodash記法
      const lodashSamples = _.sampleSize(input, size);
      expect(lodashSamples).toHaveLength(size);
      lodashSamples.forEach((item: number) => {
        expect(input).toContain(item);
      });
    });

    it('shuffle: 配列をランダムに並び替え', () => {
      const input = testData.numbers;

      // $記法
      const $shuffled = createSmartDollar(input).shuffle().value();
      expect($shuffled).toHaveLength(input.length);
      expect($shuffled.sort()).toEqual(input.sort());

      // lodash記法
      const lodashShuffled = _.shuffle(input);
      expect(lodashShuffled).toHaveLength(input.length);
      expect(lodashShuffled.sort()).toEqual(input.sort());
    });
  });

  describe('非同期メソッドのテスト ($記法のみ)', () => {
    it('mapAsync: 非同期マッピング（並列実行）', async () => {
      const input = [1, 2, 3];
      const asyncFn = async (n: number) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return n * 2;
      };

      const $result = await createSmartDollar(input).mapAsync(asyncFn);
      expect($result.data).toEqual([2, 4, 6]);
    });

    it('mapAsyncSeq: 非同期マッピング（順次実行）', async () => {
      const input = [1, 2, 3];
      const results: number[] = [];
      const asyncFn = async (n: number) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        results.push(n);
        return n * 2;
      };

      const $result = await createSmartDollar(input).mapAsyncSeq(asyncFn);
      expect($result.data).toEqual([2, 4, 6]);
      expect(results).toEqual([1, 2, 3]); // 順次実行されたことを確認
    });

    it('forEachAsync: 非同期反復処理（並列実行）', async () => {
      const input = [1, 2, 3];
      const results: number[] = [];
      const asyncFn = async (n: number) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        results.push(n);
      };

      await createSmartDollar(input).forEachAsync(asyncFn);
      expect(results.sort()).toEqual([1, 2, 3]);
    });

    it('forEachAsyncSeq: 非同期反復処理（順次実行）', async () => {
      const input = [1, 2, 3];
      const results: number[] = [];
      const asyncFn = async (n: number) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        results.push(n);
      };

      await createSmartDollar(input).forEachAsyncSeq(asyncFn);
      expect(results).toEqual([1, 2, 3]); // 順次実行されたことを確認
    });
  });
});
