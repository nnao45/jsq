import { describe, expect, it } from 'vitest';
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

  describe('Hyphenated property transformation', () => {
    it('should transform simple hyphenated properties to bracket notation', () => {
      const result = transformExpression('$.theme-command');
      expect(result).toBe('$["theme-command"]');
    });

    it('should transform nested hyphenated properties', () => {
      const result = transformExpression('$.tipsHistory.theme-command');
      expect(result).toBe('$.tipsHistory["theme-command"]');
    });

    it('should transform multiple hyphenated properties', () => {
      const result = transformExpression('$.some-property.another-one');
      expect(result).toBe('$["some-property"]["another-one"]');
    });

    it('should handle properties with multiple hyphens', () => {
      const result = transformExpression('$.very-long-property-name');
      expect(result).toBe('$["very-long-property-name"]');
    });

    it('should not transform properties without hyphens', () => {
      const result = transformExpression('$.normal.property');
      expect(result).toBe('$.normal.property');
    });

    it('should not transform hyphens inside strings', () => {
      const result = transformExpression('$.filter(x => x.name === "theme-command")');
      expect(result).toBe('$.filter(x => x.name === "theme-command")');
    });

    it('should not transform bracket notation with hyphens', () => {
      const result = transformExpression('$["theme-command"]');
      expect(result).toBe('$["theme-command"]');
    });

    it('should handle mixed dot and bracket notation', () => {
      const result = transformExpression('$.users["id-1"].theme-settings');
      expect(result).toBe('$.users["id-1"]["theme-settings"]');
    });

    it('should work with method chains after hyphenated properties', () => {
      const result = transformExpression('$.theme-command.toString()');
      expect(result).toBe('$["theme-command"].toString()');
    });

    it('should work within pipe expressions', () => {
      const result = transformExpression('$.users | $.theme-command');
      // First the pipe transformation happens, then hyphenated properties
      expect(result).toContain('["theme-command"]');
    });

    it('should transform dot notation starting with . (no $)', () => {
      const result = transformExpression('.theme-command');
      expect(result).toBe('data["theme-command"]');
    });

    it('should transform nested dot notation starting with .', () => {
      const result = transformExpression('.users.theme-settings');
      expect(result).toBe('data.users["theme-settings"]');
    });

    it('should handle properties starting with numbers', () => {
      const result = transformExpression('$.s1mAccessCache.5d3c73bd-0e6b-4e9e-9d0b-e84ab8c5f28');
      expect(result).toBe('$.s1mAccessCache["5d3c73bd-0e6b-4e9e-9d0b-e84ab8c5f28"]');
    });

    it('should handle UUID-like properties', () => {
      const result = transformExpression('$.cache.123e4567-e89b-12d3-a456-426614174000');
      expect(result).toBe('$.cache["123e4567-e89b-12d3-a456-426614174000"]');
    });

    it('should handle multiple hyphens in dot notation starting with .', () => {
      const result = transformExpression('.very-long-property-name');
      expect(result).toBe('data["very-long-property-name"]');
    });

    it('should not transform standalone .', () => {
      const result = transformExpression('.');
      expect(result).toBe('data');
    });

    it('should handle properties starting with numbers', () => {
      const result = transformExpression('$.5d3c73bd-0e6b-4e9e-9d0b-e84ab8c5f28');
      expect(result).toBe('$["5d3c73bd-0e6b-4e9e-9d0b-e84ab8c5f28"]');
    });

    it('should handle nested properties starting with numbers', () => {
      const result = transformExpression('$.data.5d3c73bd-0e6b-4e9e-9d0b-e84ab8c5f28');
      expect(result).toBe('$.data["5d3c73bd-0e6b-4e9e-9d0b-e84ab8c5f28"]');
    });

    it('should handle UUID-like properties', () => {
      const result = transformExpression('$.123e4567-e89b-12d3-a456-426614174000');
      expect(result).toBe('$["123e4567-e89b-12d3-a456-426614174000"]');
    });
  });
});
