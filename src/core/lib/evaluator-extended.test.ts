import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { JsqOptions } from '@/types/cli';
import { createApplicationContext } from '../application-context';
import { ExpressionEvaluator } from './evaluator';

describe('ExpressionEvaluator Extended Tests - JavaScript Native Evaluation 🔥', () => {
  let evaluator: ExpressionEvaluator;
  let mockOptions: JsqOptions;
  let appContext: ReturnType<typeof createApplicationContext>;

  beforeEach(() => {
    mockOptions = {
      verbose: false,
      use: undefined,
    };
    appContext = createApplicationContext();
    evaluator = new ExpressionEvaluator(mockOptions, appContext);
  });

  afterEach(async () => {
    await evaluator.dispose();
    await appContext.dispose();
  });

  describe('基本的な算術演算 (1-15)', () => {
    it('1. 足し算の基本', async () => {
      const result = await evaluator.evaluate('1 + 2', {});
      expect(result).toBe(3);
    });

    it('2. 引き算の基本', async () => {
      const result = await evaluator.evaluate('10 - 4', {});
      expect(result).toBe(6);
    });

    it('3. 掛け算の基本', async () => {
      const result = await evaluator.evaluate('3 * 4', {});
      expect(result).toBe(12);
    });

    it('4. 割り算の基本', async () => {
      const result = await evaluator.evaluate('15 / 3', {});
      expect(result).toBe(5);
    });

    it('5. 剰余演算', async () => {
      const result = await evaluator.evaluate('17 % 5', {});
      expect(result).toBe(2);
    });

    it('6. べき乗演算', async () => {
      const result = await evaluator.evaluate('2 ** 8', {});
      expect(result).toBe(256);
    });

    it('7. 複合演算', async () => {
      const result = await evaluator.evaluate('(2 + 3) * 4 - 1', {});
      expect(result).toBe(19);
    });

    it('8. 浮動小数点演算', async () => {
      const result = await evaluator.evaluate('0.1 + 0.2', {});
      expect(result).toBeCloseTo(0.3);
    });

    it('9. 大きな数の演算', async () => {
      const result = await evaluator.evaluate('999999999 * 999999999', {});
      expect(result).toBe(999999998000000000);
    });

    it('10. 負の数の演算', async () => {
      const result = await evaluator.evaluate('-5 + 3', {});
      expect(result).toBe(-2);
    });

    it('11. インクリメント演算子（前置）', async () => {
      const data = { x: 5 };
      const result = await evaluator.evaluate('++$.x', data);
      expect(result).toBe(6);
    });

    it('12. デクリメント演算子（前置）', async () => {
      const data = { x: 5 };
      const result = await evaluator.evaluate('--$.x', data);
      expect(result).toBe(4);
    });

    it('13. 複合代入演算子のシミュレート', async () => {
      const data = { x: 10 };
      const result = await evaluator.evaluate('$.x + 5', data);
      expect(result).toBe(15);
    });

    it('14. 括弧を使った優先順位制御', async () => {
      const result = await evaluator.evaluate('2 * (3 + 4) * 5', {});
      expect(result).toBe(70);
    });

    it('15. ゼロ除算', async () => {
      const result = await evaluator.evaluate('1 / 0', {});
      expect(result).toBe(Infinity);
    });
  });

  describe('文字列操作 (16-30)', () => {
    it('16. 文字列結合', async () => {
      const result = await evaluator.evaluate('"Hello, " + "World!"', {});
      expect(result).toBe('Hello, World!');
    });

    it('17. テンプレートリテラル', async () => {
      const data = { name: 'Alice' };
      const result = await evaluator.evaluate('`Hello, ${$.name}!`', data);
      expect(result).toBe('Hello, Alice!');
    });

    it('18. 文字列の長さ', async () => {
      const result = await evaluator.evaluate('"JavaScript".length', {});
      expect(result).toBe(10);
    });

    it('19. 文字列のインデックスアクセス', async () => {
      const result = await evaluator.evaluate('"Hello"[1]', {});
      expect(result).toBe('e');
    });

    it('20. 文字列のメソッド - toUpperCase', async () => {
      const result = await evaluator.evaluate('"hello".toUpperCase()', {});
      expect(result).toBe('HELLO');
    });

    it('21. 文字列のメソッド - toLowerCase', async () => {
      const result = await evaluator.evaluate('"WORLD".toLowerCase()', {});
      expect(result).toBe('world');
    });

    it('22. 文字列のメソッド - slice', async () => {
      const result = await evaluator.evaluate('"JavaScript".slice(0, 4)', {});
      expect(result).toBe('Java');
    });

    it('23. 文字列のメソッド - split', async () => {
      const result = await evaluator.evaluate('"a,b,c".split(",")', {});
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('24. 文字列のメソッド - replace', async () => {
      const result = await evaluator.evaluate('"Hello World".replace("World", "JSQ")', {});
      expect(result).toBe('Hello JSQ');
    });

    it('25. 文字列のメソッド - trim', async () => {
      const result = await evaluator.evaluate('"  hello  ".trim()', {});
      expect(result).toBe('hello');
    });

    it('26. 文字列のメソッド - includes', async () => {
      const result = await evaluator.evaluate('"JavaScript".includes("Script")', {});
      expect(result).toBe(true);
    });

    it('27. 文字列のメソッド - startsWith', async () => {
      const result = await evaluator.evaluate('"JavaScript".startsWith("Java")', {});
      expect(result).toBe(true);
    });

    it('28. 文字列のメソッド - endsWith', async () => {
      const result = await evaluator.evaluate('"JavaScript".endsWith("Script")', {});
      expect(result).toBe(true);
    });

    it('29. 文字列のメソッド - repeat', async () => {
      const result = await evaluator.evaluate('"ha".repeat(3)', {});
      expect(result).toBe('hahaha');
    });

    it('30. 文字列のメソッド - padStart', async () => {
      const result = await evaluator.evaluate('"5".padStart(3, "0")', {});
      expect(result).toBe('005');
    });
  });

  describe('配列操作 (31-50)', () => {
    it('31. 配列の作成', async () => {
      const result = await evaluator.evaluate('[1, 2, 3]', {});
      expect(result).toEqual([1, 2, 3]);
    });

    it('32. 配列の長さ', async () => {
      const result = await evaluator.evaluate('[1, 2, 3, 4, 5].length', {});
      expect(result).toBe(5);
    });

    it('33. 配列のインデックスアクセス', async () => {
      const result = await evaluator.evaluate('[10, 20, 30][1]', {});
      expect(result).toBe(20);
    });

    it('34. 配列のメソッド - push', async () => {
      const data = { arr: [1, 2, 3] };
      const result = await evaluator.evaluate('($.arr.push(4), $.arr)', data);
      expect(result).toEqual([1, 2, 3, 4]);
    });

    it('35. 配列のメソッド - pop', async () => {
      const result = await evaluator.evaluate('[1, 2, 3].pop()', {});
      expect(result).toBe(3);
    });

    it('36. 配列のメソッド - shift', async () => {
      const result = await evaluator.evaluate('[1, 2, 3].shift()', {});
      expect(result).toBe(1);
    });

    it('37. 配列のメソッド - unshift', async () => {
      const data = { arr: [2, 3] };
      const result = await evaluator.evaluate('($.arr.unshift(1), $.arr)', data);
      expect(result).toEqual([1, 2, 3]);
    });

    it('38. 配列のメソッド - concat', async () => {
      const result = await evaluator.evaluate('[1, 2].concat([3, 4])', {});
      expect(result).toEqual([1, 2, 3, 4]);
    });

    it('39. 配列のメソッド - slice', async () => {
      const result = await evaluator.evaluate('[1, 2, 3, 4, 5].slice(1, 3)', {});
      expect(result).toEqual([2, 3]);
    });

    it('40. 配列のメソッド - splice', async () => {
      const data = { arr: [1, 2, 3, 4, 5] };
      const result = await evaluator.evaluate('$.arr.splice(2, 1)', data);
      expect(result).toEqual([3]);
    });

    it('41. 配列のメソッド - indexOf', async () => {
      const result = await evaluator.evaluate('[1, 2, 3, 2, 1].indexOf(2)', {});
      expect(result).toBe(1);
    });

    it('42. 配列のメソッド - lastIndexOf', async () => {
      const result = await evaluator.evaluate('[1, 2, 3, 2, 1].lastIndexOf(2)', {});
      expect(result).toBe(3);
    });

    it('43. 配列のメソッド - includes', async () => {
      const result = await evaluator.evaluate('[1, 2, 3].includes(2)', {});
      expect(result).toBe(true);
    });

    it('44. 配列のメソッド - reverse', async () => {
      const result = await evaluator.evaluate('[1, 2, 3].reverse()', {});
      expect(result).toEqual([3, 2, 1]);
    });

    it('45. 配列のメソッド - sort', async () => {
      const result = await evaluator.evaluate('[3, 1, 4, 1, 5].sort()', {});
      expect(result).toEqual([1, 1, 3, 4, 5]);
    });

    it('46. 配列のメソッド - sort with compare function', async () => {
      const result = await evaluator.evaluate('[10, 5, 40, 25].sort((a, b) => a - b)', {});
      expect(result).toEqual([5, 10, 25, 40]);
    });

    it('47. 配列のメソッド - every', async () => {
      const result = await evaluator.evaluate('[2, 4, 6, 8].every(n => n % 2 === 0)', {});
      expect(result).toBe(true);
    });

    it('48. 配列のメソッド - some', async () => {
      const result = await evaluator.evaluate('[1, 3, 5, 6].some(n => n % 2 === 0)', {});
      expect(result).toBe(true);
    });

    it('49. 配列のメソッド - find', async () => {
      const result = await evaluator.evaluate('[1, 2, 3, 4, 5].find(n => n > 3)', {});
      expect(result).toBe(4);
    });

    it('50. 配列のメソッド - findIndex', async () => {
      const result = await evaluator.evaluate('[1, 2, 3, 4, 5].findIndex(n => n > 3)', {});
      expect(result).toBe(3);
    });
  });

  describe('オブジェクト操作 (51-65)', () => {
    it('51. オブジェクトの作成', async () => {
      const result = await evaluator.evaluate('({name: "Alice", age: 30})', {});
      expect(result).toEqual({ name: 'Alice', age: 30 });
    });

    it('52. オブジェクトのプロパティアクセス（ドット記法）', async () => {
      const data = { user: { name: 'Bob' } };
      const result = await evaluator.evaluate('$.user.name', data);
      expect(result).toBe('Bob');
    });

    it('53. オブジェクトのプロパティアクセス（ブラケット記法）', async () => {
      const data = { user: { 'first-name': 'Charlie' } };
      const result = await evaluator.evaluate('$.user["first-name"]', data);
      expect(result).toBe('Charlie');
    });

    it('54. Object.keys', async () => {
      const result = await evaluator.evaluate('Object.keys({a: 1, b: 2, c: 3})', {});
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('55. Object.values', async () => {
      const result = await evaluator.evaluate('Object.values({a: 1, b: 2, c: 3})', {});
      expect(result).toEqual([1, 2, 3]);
    });

    it('56. Object.entries', async () => {
      const result = await evaluator.evaluate('Object.entries({a: 1, b: 2})', {});
      expect(result).toEqual([
        ['a', 1],
        ['b', 2],
      ]);
    });

    it('57. Object.assign', async () => {
      const result = await evaluator.evaluate('Object.assign({}, {a: 1}, {b: 2})', {});
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('58. スプレッド構文（オブジェクト）', async () => {
      const data = { obj: { a: 1, b: 2 } };
      const result = await evaluator.evaluate('({...$.obj, c: 3})', data);
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('59. in演算子', async () => {
      const result = await evaluator.evaluate('"name" in {name: "Alice", age: 30}', {});
      expect(result).toBe(true);
    });

    it('60. hasOwnProperty', async () => {
      const result = await evaluator.evaluate('({a: 1}).hasOwnProperty("a")', {});
      expect(result).toBe(true);
    });

    it('61. Object.freeze', async () => {
      const result = await evaluator.evaluate('Object.isFrozen(Object.freeze({a: 1}))', {});
      expect(result).toBe(true);
    });

    it('62. Object.seal', async () => {
      const result = await evaluator.evaluate('Object.isSealed(Object.seal({a: 1}))', {});
      expect(result).toBe(true);
    });

    it('63. Object.create', async () => {
      const result = await evaluator.evaluate('Object.create({a: 1}).constructor === Object', {});
      expect(result).toBe(true);
    });

    it('64. 計算されたプロパティ名', async () => {
      const data = { key: 'dynamic' };
      const result = await evaluator.evaluate('({[$.key]: "value"})', data);
      expect(result).toEqual({ dynamic: 'value' });
    });

    it('65. 分割代入（オブジェクト）', async () => {
      const result = await evaluator.evaluate('(({a, b}) => a + b)({a: 1, b: 2})', {});
      expect(result).toBe(3);
    });
  });

  describe('論理演算とビット演算 (66-80)', () => {
    it('66. AND演算子', async () => {
      const result = await evaluator.evaluate('true && true', {});
      expect(result).toBe(true);
    });

    it('67. OR演算子', async () => {
      const result = await evaluator.evaluate('false || true', {});
      expect(result).toBe(true);
    });

    it('68. NOT演算子', async () => {
      const result = await evaluator.evaluate('!false', {});
      expect(result).toBe(true);
    });

    it('69. 三項演算子', async () => {
      const result = await evaluator.evaluate('5 > 3 ? "yes" : "no"', {});
      expect(result).toBe('yes');
    });

    it('70. Nullish coalescing演算子', async () => {
      const result = await evaluator.evaluate('null ?? "default"', {});
      expect(result).toBe('default');
    });

    it('71. Optional chaining', async () => {
      const data = { user: { name: 'Alice' } };
      const result = await evaluator.evaluate('$.user?.name', data);
      expect(result).toBe('Alice');
    });

    it('72. ビットAND', async () => {
      const result = await evaluator.evaluate('5 & 3', {});
      expect(result).toBe(1);
    });

    it('73. ビットOR', async () => {
      const result = await evaluator.evaluate('(5 | 3)', {});
      expect(result).toBe(7);
    });

    it('74. ビットXOR', async () => {
      const result = await evaluator.evaluate('5 ^ 3', {});
      expect(result).toBe(6);
    });

    it('75. ビットNOT', async () => {
      const result = await evaluator.evaluate('~5', {});
      expect(result).toBe(-6);
    });

    it('76. 左シフト', async () => {
      const result = await evaluator.evaluate('5 << 1', {});
      expect(result).toBe(10);
    });

    it('77. 右シフト', async () => {
      const result = await evaluator.evaluate('10 >> 1', {});
      expect(result).toBe(5);
    });

    it('78. ゼロ埋め右シフト', async () => {
      const result = await evaluator.evaluate('10 >>> 1', {});
      expect(result).toBe(5);
    });

    it('79. 短絡評価（AND）', async () => {
      const result = await evaluator.evaluate('null && "unreachable"', {});
      expect(result).toBe(null);
    });

    it('80. 短絡評価（OR）', async () => {
      const result = await evaluator.evaluate('"first" || "second"', {});
      expect(result).toBe('first');
    });
  });

  describe('型変換と型チェック (81-95)', () => {
    it('81. 文字列から数値への変換', async () => {
      const result = await evaluator.evaluate('Number("123")', {});
      expect(result).toBe(123);
    });

    it('82. 数値から文字列への変換', async () => {
      const result = await evaluator.evaluate('String(123)', {});
      expect(result).toBe('123');
    });

    it('83. parseInt', async () => {
      const result = await evaluator.evaluate('parseInt("123.45")', {});
      expect(result).toBe(123);
    });

    it('84. parseFloat', async () => {
      const result = await evaluator.evaluate('parseFloat("123.45")', {});
      expect(result).toBe(123.45);
    });

    it('85. Boolean変換', async () => {
      const result = await evaluator.evaluate('Boolean(1)', {});
      expect(result).toBe(true);
    });

    it('86. typeof演算子', async () => {
      const result = await evaluator.evaluate('typeof "hello"', {});
      expect(result).toBe('string');
    });

    it('87. instanceof演算子', async () => {
      const result = await evaluator.evaluate('[] instanceof Array', {});
      expect(result).toBe(true);
    });

    it('88. Array.isArray', async () => {
      const result = await evaluator.evaluate('Array.isArray([1, 2, 3])', {});
      expect(result).toBe(true);
    });

    it('89. isNaN', async () => {
      const result = await evaluator.evaluate('isNaN("not a number")', {});
      expect(result).toBe(true);
    });

    it('90. isFinite', async () => {
      const result = await evaluator.evaluate('isFinite(123)', {});
      expect(result).toBe(true);
    });

    it('91. Number.isInteger', async () => {
      const result = await evaluator.evaluate('Number.isInteger(42)', {});
      expect(result).toBe(true);
    });

    it('92. Number.isSafeInteger', async () => {
      const result = await evaluator.evaluate('Number.isSafeInteger(9007199254740991)', {});
      expect(result).toBe(true);
    });

    it('93. 暗黙的な型変換（数値）', async () => {
      const result = await evaluator.evaluate('"5" * "2"', {});
      expect(result).toBe(10);
    });

    it('94. 暗黙的な型変換（文字列）', async () => {
      const result = await evaluator.evaluate('5 + "5"', {});
      expect(result).toBe('55');
    });

    it('95. truthy/falsy値', async () => {
      const result = await evaluator.evaluate('!!"non-empty string"', {});
      expect(result).toBe(true);
    });
  });

  describe('特殊な値とエラーケース (96-100)', () => {
    it('96. NaNの演算', async () => {
      const result = await evaluator.evaluate('NaN === NaN', {});
      expect(result).toBe(false);
    });

    it('97. Infinityの演算', async () => {
      const result = await evaluator.evaluate('1 / Infinity', {});
      expect(result).toBe(0);
    });

    it('98. undefinedの扱い', async () => {
      const result = await evaluator.evaluate('undefined === undefined', {});
      expect(result).toBe(true);
    });

    it('99. nullの扱い', async () => {
      const result = await evaluator.evaluate('null == undefined', {});
      expect(result).toBe(true);
    });

    it('100. 複雑な入れ子構造の評価 🎉', async () => {
      const data = {
        users: [
          { id: 1, scores: [80, 90, 85] },
          { id: 2, scores: [75, 88, 92] },
          { id: 3, scores: [90, 95, 88] },
        ],
      };

      // 手動で計算してみる
      // ユーザー1: (80 + 90 + 85) / 3 = 255 / 3 = 85
      // ユーザー2: (75 + 88 + 92) / 3 = 255 / 3 = 85
      // ユーザー3: (90 + 95 + 88) / 3 = 273 / 3 = 91
      // 85より大きいのはユーザー3だけ！

      const result = await evaluator.evaluate(
        `$.users
          .map(u => ({
            ...u,
            average: u.scores.reduce((a, b) => a + b, 0) / u.scores.length
          }))
          .filter(u => u.average > 85)
          .sort((a, b) => b.average - a.average)
          .map(u => u.id)`,
        data
      );
      expect(result).toEqual([3]);
    });
  });
});
