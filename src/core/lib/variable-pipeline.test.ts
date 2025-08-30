import { describe, expect, it } from 'vitest';
import { createApplicationContext } from '../application-context';
import { ExpressionTransformer } from './expression-transformer';

describe('Variable Pipeline Declaration', () => {
  const appContext = createApplicationContext();
  describe('hasVariablePipelineDeclaration', () => {
    it('should detect const variable pipeline', () => {
      const expr = "const a = 'hello' | a.toUpperCase()";
      expect(ExpressionTransformer.hasVariablePipelineDeclaration(expr)).toBe(true);
    });

    it('should detect let variable pipeline', () => {
      const expr = 'let b = [1,2,3] | b.length';
      expect(ExpressionTransformer.hasVariablePipelineDeclaration(expr)).toBe(true);
    });

    it('should not detect regular variable declaration', () => {
      const expr = "const a = 'hello'";
      expect(ExpressionTransformer.hasVariablePipelineDeclaration(expr)).toBe(false);
    });

    it('should not detect regular expression', () => {
      const expr = '$.users.map(u => u.name)';
      expect(ExpressionTransformer.hasVariablePipelineDeclaration(expr)).toBe(false);
    });

    it('should handle complex initial values', () => {
      const expr = 'const data = $.users.filter(u => u.active) | data.length';
      expect(ExpressionTransformer.hasVariablePipelineDeclaration(expr)).toBe(true);
    });
  });

  describe('transformVariablePipelineDeclaration', () => {
    it('should transform const variable pipeline to IIFE', () => {
      const expr = "const a = 'hello' | a.toUpperCase()";
      const result = ExpressionTransformer.transformVariablePipelineDeclaration(expr);

      expect(result).toContain('(() => {');
      expect(result).toContain("let a = 'hello';");
      expect(result).toContain('return a.toUpperCase();');
      expect(result).toContain('})()');
    });

    it('should transform let variable pipeline to IIFE', () => {
      const expr = 'let nums = [1,2,3] | nums.filter(x => x > 1)';
      const result = ExpressionTransformer.transformVariablePipelineDeclaration(expr);

      expect(result).toContain('(() => {');
      expect(result).toContain('let nums = [1,2,3];');
      expect(result).toContain('return nums.filter(x => x > 1);');
      expect(result).toContain('})()');
    });

    it('should include ChainableWrapper unwrapping logic', () => {
      const expr = 'const data = $.users | data.length';
      const result = ExpressionTransformer.transformVariablePipelineDeclaration(expr);

      expect(result).toContain("if (data && typeof data === 'object'");
      expect(result).toContain('data.value !== undefined');
      expect(result).toContain('data.valueOf()');
    });

    it('should handle complex pipeline expressions', () => {
      const expr = "const result = $.users.map(u => u.name) | result.join(', ')";
      const result = ExpressionTransformer.transformVariablePipelineDeclaration(expr);

      expect(result).toContain('let result = $.users.map(u => u.name);');
      expect(result).toContain("return result.join(', ');");
    });
  });

  describe('transformExpression integration', () => {
    it('should transform variable pipeline through main transform function', () => {
      const expr = "const x = 'test' | x.length";
      const result = ExpressionTransformer.transform(expr, appContext.expressionCache);

      expect(result).toContain('(() => {');
      expect(result).toContain("let x = 'test';");
      expect(result).toContain('return x.length;');
    });

    it('should not interfere with regular expressions', () => {
      const expr = '$.users.map(u => u.name)';
      const result = ExpressionTransformer.transform(expr, appContext.expressionCache);

      expect(result).toBe(expr);
    });

    it('should not interfere with regular pipe expressions', () => {
      const expr = '$.users | $.map(u => u.name)';
      const result = ExpressionTransformer.transform(expr, appContext.expressionCache);

      // Should be transformed by regular pipe logic, not variable pipeline
      expect(result).not.toContain('(() => {');
    });
  });
});
