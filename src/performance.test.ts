import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApplicationContext } from './core/application-context';
import { ExpressionEvaluator } from './core/lib/evaluator';
import { JsqProcessor } from './core/lib/processor';
import type { JsqOptions } from './types/cli';

describe('Performance Tests', () => {
  let evaluator: ExpressionEvaluator;
  let processor: JsqProcessor;
  let options: JsqOptions;
  let appContext: ReturnType<typeof createApplicationContext>;

  beforeEach(() => {
    options = {
      debug: false,
      verbose: false,
      unsafe: true,
      safe: false,
    };
    appContext = createApplicationContext();
    evaluator = new ExpressionEvaluator(options, appContext);
    processor = new JsqProcessor(options, appContext);
  });

  describe('Large Data Processing', () => {
    it('should process large arrays efficiently', async () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: Math.random() * 1000,
        category: i % 5,
      }));

      const startTime = Date.now();
      const result = await evaluator.evaluate(
        '$.filter(item => item.value > 500).length()',
        largeArray
      );
      const endTime = Date.now();

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(10000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it.skip('should handle deep nesting efficiently', async () => {
      const deepObject = { level: 0 };
      let current = deepObject;

      // Create a deeply nested object (100 levels)
      for (let i = 1; i < 100; i++) {
        current.nested = { level: i };
        current = current.nested;
      }
      current.value = 'deep value';

      const startTime = Date.now();
      const result = await evaluator.evaluate('$.value', deepObject);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
    });

    it('should process complex JSON transformations efficiently', async () => {
      const complexData = {
        users: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`,
          orders: Array.from({ length: Math.floor(Math.random() * 10) }, (_, j) => ({
            orderId: `${i}-${j}`,
            amount: Math.random() * 500,
            items: Math.floor(Math.random() * 5) + 1,
          })),
        })),
      };

      const expression = `
        $.users
          .filter(user => user.orders.length > 0)
          .map(user => ({
            name: user.name,
            totalSpent: user.orders.reduce((sum, order) => sum + order.amount, 0),
            orderCount: user.orders.length
          }))
          .filter(user => user.totalSpent > 1000)
      `;

      const startTime = Date.now();
      const result = await evaluator.evaluate(expression, complexData);
      const endTime = Date.now();

      expect(Array.isArray(result)).toBe(true);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('String Processing Performance', () => {
    it.skip('should handle large JSON strings efficiently', async () => {
      const largeData = {
        items: Array.from({ length: 5000 }, (_, i) => ({
          id: i,
          description: `This is a longer description for item ${i} with some additional text to make it more realistic`,
          tags: [`tag${i % 10}`, `category${i % 3}`, `type${i % 7}`],
          metadata: {
            created: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
            updated: new Date().toISOString(),
            version: Math.floor(Math.random() * 100),
          },
        })),
      };

      const jsonString = JSON.stringify(largeData);
      expect(jsonString.length).toBeGreaterThan(1000000); // Ensure it's actually large

      const startTime = Date.now();
      const result = await processor.process('$.items.length', jsonString);
      const endTime = Date.now();

      expect(result.data).toBe(5000);
      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds
    });

    it.skip('should handle multiple JSONL lines efficiently', async () => {
      const jsonlLines = Array.from({ length: 1000 }, (_, i) =>
        JSON.stringify({
          id: i,
          timestamp: new Date().toISOString(),
          data: Array.from({ length: 10 }, (_, j) => ({ key: j, value: Math.random() })),
        })
      ).join('\n');

      const startTime = Date.now();
      const result = await processor.process('$.length', jsonlLines);
      const endTime = Date.now();

      expect(result.data).toBeDefined();
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Memory Efficiency', () => {
    it.skip('should not cause memory leaks with repeated evaluations', async () => {
      const testData = Array.from({ length: 100 }, (_, i) => ({ id: i, value: i * 2 }));

      // Get initial memory usage (rough estimate)
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many evaluations
      for (let i = 0; i < 100; i++) {
        await evaluator.evaluate(
          '$.map(item => item.value).reduce((sum, val) => sum + val, 0)',
          testData
        );
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be reasonable (less than 50MB for this test)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    });

    it.skip('should handle concurrent evaluations efficiently', async () => {
      const testData = Array.from({ length: 500 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: Math.random() * 100,
      }));

      const expressions = [
        '$.filter(item => item.value > 50).value.length',
        '$.map(item => item.value).value.reduce((sum, val) => sum + val, 0)',
        '$.value.slice(0, 10)',
        '$.value.find(item => item.value > 90)',
      ];

      const startTime = Date.now();

      // Run multiple expressions concurrently
      const promises = expressions.map(expr => evaluator.evaluate(expr, testData));
      const results = await Promise.all(promises);

      const endTime = Date.now();

      expect(results).toHaveLength(5);
      for (const result of results) {
        expect(result).toBeDefined();
      }
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Expression Complexity Performance', () => {
    it('should handle complex chained operations efficiently', async () => {
      const data = {
        sales: Array.from({ length: 2000 }, (_, i) => ({
          id: i,
          date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          amount: Math.random() * 1000,
          category: ['electronics', 'clothing', 'books', 'home'][i % 4],
          salesperson: `Person ${i % 20}`,
        })),
      };

      const complexExpression = `
        $.sales
          .filter(sale => sale.amount > 100)
          .map(sale => ({ category: sale.category, amount: sale.amount }))
      `;

      const startTime = Date.now();
      const result = await evaluator.evaluate(complexExpression, data);
      const endTime = Date.now();

      expect(Array.isArray(result)).toBe(true);
      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds
    });

    it('should handle pipe operator chains efficiently', async () => {
      const data = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        score: Math.random() * 100,
        category: i % 5,
        active: Math.random() > 0.3,
      }));

      const pipeExpression = `
        $.filter(item => item.active).filter(item => item.score > 50)
      `;

      const startTime = Date.now();
      const result = await evaluator.evaluate(pipeExpression, data);
      const endTime = Date.now();

      expect(Array.isArray(result)).toBe(true);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  afterEach(async () => {
    await evaluator.dispose();
    await processor.dispose();
    await appContext.dispose();
  });
});
