import { describe, expect, it } from '@jest/globals';
import { ExpressionTransformer, transformExpression } from './expression-transformer';

describe('Expression Transformer Tests', () => {
  describe('Semicolon operator detection and transformation', () => {
    it('should detect semicolon operator', () => {
      expect(ExpressionTransformer.hasSemicolonOperator('$.name; $.age')).toBe(true);
      expect(ExpressionTransformer.hasSemicolonOperator('console.log($); $.value')).toBe(true);
      expect(ExpressionTransformer.hasSemicolonOperator('$.a; $.b; $.c')).toBe(true);
    });

    it('should not detect semicolons in strings', () => {
      expect(ExpressionTransformer.hasSemicolonOperator('"hello; world"')).toBe(false);
      expect(ExpressionTransformer.hasSemicolonOperator('$.message + "; processed"')).toBe(false);
      expect(ExpressionTransformer.hasSemicolonOperator('`template; string`')).toBe(false);
    });

    it('should not detect semicolons inside parentheses, braces, or brackets', () => {
      expect(ExpressionTransformer.hasSemicolonOperator('func(a; b)')).toBe(false);
      expect(ExpressionTransformer.hasSemicolonOperator('{ a: 1; b: 2 }')).toBe(false);
      expect(ExpressionTransformer.hasSemicolonOperator('[a; b; c]')).toBe(false);
    });

    it('should correctly split expressions by semicolons', () => {
      const parts = ExpressionTransformer.splitBySemicolon('$.name; $.age; $.city');
      expect(parts).toEqual(['$.name', '$.age', '$.city']);
    });

    it('should handle semicolons with whitespace', () => {
      const parts = ExpressionTransformer.splitBySemicolon('$.name ; $.age;$.city');
      expect(parts).toEqual(['$.name', '$.age', '$.city']);
    });

    it('should transform simple semicolon expressions', () => {
      const result = transformExpression('$.name; $.age');
      expect(result).toContain('$.name;');
      expect(result).toContain('return $.age;');
      expect(result).toMatch(/\(\(\) => \{[\s\S]*\}\)\(\)/);
    });

    it('should transform multiple semicolon expressions', () => {
      const result = transformExpression('$.a; $.b; $.c');
      expect(result).toContain('$.a;');
      expect(result).toContain('$.b;');
      expect(result).toContain('return $.c;');
    });

    it('should handle async semicolon expressions', () => {
      const result = transformExpression('const data = await fetch("/api"); data.json()');
      expect(result).toContain('async ()');
      expect(result).toContain('const data = await fetch("/api");');
      expect(result).toContain('return data.json();');
    });
  });

  describe('Integration with other transformations', () => {
    it('should prioritize semicolon over pipe operations', () => {
      const result = transformExpression('$.users | $.length; $.name');
      expect(result).toContain('$.users | $.length;');
      expect(result).toContain('return $.name;');
    });

    it('should handle variable declarations with semicolons', () => {
      const result = transformExpression('const x = $.value; x * 2');
      expect(result).toContain('const x = $.value;');
      expect(result).toContain('return x * 2;');
    });
  });

  describe('Edge cases', () => {
    it('should handle single expressions (no semicolon)', () => {
      const result = transformExpression('$.value');
      expect(result).toBe('$.value');
    });

    it('should handle empty parts', () => {
      const parts = ExpressionTransformer.splitBySemicolon('$.a;; $.b');
      expect(parts).toEqual(['$.a', '$.b']);
    });

    it('should handle trailing semicolon', () => {
      const parts = ExpressionTransformer.splitBySemicolon('$.a; $.b;');
      expect(parts).toEqual(['$.a', '$.b']);
    });
  });
});
