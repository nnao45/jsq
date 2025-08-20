import { beforeEach, describe, expect, it } from '@jest/globals';
import type { JsqOptions } from '@/types/cli';
import { JsqProcessor } from './processor';

describe('JsqProcessor', () => {
  let processor: JsqProcessor;
  let mockOptions: JsqOptions;

  beforeEach(() => {
    mockOptions = {
      debug: false,
      verbose: false,
      unsafe: false,
    };
    processor = new JsqProcessor(mockOptions);
  });

  describe('Basic processing', () => {
    it('should process simple JSON with basic expressions', async () => {
      const input = '{"name": "Alice", "age": 30}';
      const expression = '$.name';

      const result = await processor.process(expression, input);

      expect(result.data).toBe('Alice');
      expect(result.metadata).toBeDefined();
      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.inputSize).toBe(input.length);
    });

    it('should process array data with chaining operations', async () => {
      const input = JSON.stringify([
        { name: 'Alice', age: 30, department: 'engineering' },
        { name: 'Bob', age: 25, department: 'design' },
        { name: 'Charlie', age: 35, department: 'engineering' },
      ]);

      const expression = '$.filter(u => u.department === "engineering").pluck("name")';

      const result = await processor.process(expression, input);

      expect(result.data).toEqual(['Alice', 'Charlie']);
      expect(result.metadata.inputSize).toBe(input.length);
    });

    it('should handle complex nested data structures', async () => {
      const input = JSON.stringify({
        company: {
          departments: {
            engineering: {
              teams: [
                { name: 'Frontend', members: 5 },
                { name: 'Backend', members: 8 },
              ],
            },
            design: {
              teams: [
                { name: 'UX', members: 3 },
                { name: 'Visual', members: 4 },
              ],
            },
          },
        },
      });

      const expression = `
        Object.values($.company.departments.value)
          .map(dept => dept.teams)
          .map(teams => teams.reduce((sum, team) => sum + team.members, 0))
      `;

      const result = await processor.process(expression, input);

      expect(result.data).toEqual([13, 7]); // engineering: 5+8, design: 3+4
    });
  });

  describe('Processing metadata', () => {
    it('should provide basic metadata for all processes', async () => {
      const input = '{"test": "data"}';
      const expression = '$.test';

      const result = await processor.process(expression, input);

      expect(result.metadata).toHaveProperty('processingTime');
      expect(result.metadata).toHaveProperty('inputSize');
      expect(result.metadata).toHaveProperty('outputSize');

      expect(typeof result.metadata.processingTime).toBe('number');
      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.inputSize).toBe(input.length);
      expect(result.metadata.outputSize).toBeGreaterThan(0);
    });

    it('should include debug steps when debug mode is enabled', async () => {
      const debugProcessor = new JsqProcessor({ ...mockOptions, debug: true });
      const input = '{"test": "data"}';
      const expression = '$.test';

      const result = await debugProcessor.process(expression, input);

      expect(result.metadata).toHaveProperty('steps');
      expect(Array.isArray(result.metadata.steps)).toBe(true);
      expect(result.metadata.steps).toContain('Parse JSON');
      expect(result.metadata.steps).toContain('Evaluate expression');
      expect(result.metadata.steps).toContain('Format output');
    });

    it('should measure processing time accurately', async () => {
      const input = JSON.stringify(
        Array.from({ length: 1000 }, (_, i) => ({ id: i, value: Math.random() }))
      );
      const expression = '$.filter(item => item.value > 0.5).length()';

      const startTime = Date.now();
      const result = await processor.process(expression, input);
      const endTime = Date.now();

      expect(result.metadata.processingTime).toBeLessThanOrEqual(endTime - startTime);
      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error handling', () => {
    it('should handle JSON parsing errors', async () => {
      const invalidJson = '{"invalid": json}';
      const expression = '$.test';

      await expect(processor.process(expression, invalidJson)).rejects.toThrow('Processing failed');
    });

    it('should handle expression evaluation errors', async () => {
      const input = '{"valid": "json"}';
      const invalidExpression = 'invalid.expression.syntax+++';

      await expect(processor.process(invalidExpression, input)).rejects.toThrow(
        'Processing failed'
      );
    });

    it('should handle empty input', async () => {
      const expression = '$.test';

      await expect(processor.process(expression, '')).rejects.toThrow('Processing failed');
    });

    it('should provide meaningful error messages', async () => {
      const input = '{"data": "valid"}';
      const expression = 'nonexistent.method()';

      try {
        await processor.process(expression, input);
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toContain('Processing failed');
      }
    });
  });

  describe('Real-world data processing scenarios', () => {
    it('should process API response data', async () => {
      const apiResponse = {
        status: 'success',
        data: {
          users: [
            { id: 1, name: 'Alice', email: 'alice@example.com', active: true },
            { id: 2, name: 'Bob', email: 'bob@example.com', active: false },
            { id: 3, name: 'Charlie', email: 'charlie@example.com', active: true },
          ],
          pagination: { total: 3, page: 1, limit: 10 },
        },
      };

      const expression = '$.data.users.filter(u => u.active).pluck("email")';

      const result = await processor.process(expression, JSON.stringify(apiResponse));

      expect(result.data).toEqual(['alice@example.com', 'charlie@example.com']);
    });

    it('should process log data analysis', async () => {
      const logData = {
        logs: [
          {
            timestamp: '2023-01-01T10:00:00Z',
            level: 'info',
            service: 'api',
            message: 'Request processed',
          },
          {
            timestamp: '2023-01-01T10:01:00Z',
            level: 'error',
            service: 'db',
            message: 'Connection timeout',
          },
          {
            timestamp: '2023-01-01T10:02:00Z',
            level: 'warn',
            service: 'api',
            message: 'High latency',
          },
          {
            timestamp: '2023-01-01T10:03:00Z',
            level: 'error',
            service: 'api',
            message: 'Request failed',
          },
          {
            timestamp: '2023-01-01T10:04:00Z',
            level: 'info',
            service: 'db',
            message: 'Connection restored',
          },
        ],
      };

      const expression = `
        $.logs
          .filter(log => log.level === 'error')
          .map(log => ({ service: log.service, message: log.message }))
      `;

      const result = await processor.process(expression, JSON.stringify(logData));

      expect(result.data).toEqual([
        { service: 'db', message: 'Connection timeout' },
        { service: 'api', message: 'Request failed' },
      ]);
    });

    it('should process sales/analytics data', async () => {
      const salesData = {
        sales: [
          { product: 'laptop', quantity: 2, price: 999.99, region: 'US' },
          { product: 'mouse', quantity: 10, price: 29.99, region: 'US' },
          { product: 'laptop', quantity: 1, price: 999.99, region: 'EU' },
          { product: 'keyboard', quantity: 5, price: 79.99, region: 'US' },
          { product: 'mouse', quantity: 8, price: 29.99, region: 'EU' },
        ],
      };

      const expression = `
        $.sales.value
          .map(sale => ({ 
            product: sale.product, 
            revenue: sale.quantity * sale.price,
            region: sale.region 
          }))
          .filter(sale => sale.region === 'US')
          .reduce((total, sale) => total + sale.revenue, 0)
      `;

      const result = await processor.process(expression, JSON.stringify(salesData));

      // 2*999.99 + 10*29.99 + 5*79.99 = 1999.98 + 299.9 + 399.95 = 2699.83
      expect(result.data).toBeCloseTo(2699.83, 2);
    });

    it('should process configuration and settings data', async () => {
      const configData = {
        environments: {
          development: {
            database: { host: 'localhost', port: 5432 },
            redis: { host: 'localhost', port: 6379 },
            features: { debug: true, cache: false },
          },
          production: {
            database: { host: 'prod-db.example.com', port: 5432 },
            redis: { host: 'prod-redis.example.com', port: 6379 },
            features: { debug: false, cache: true },
          },
        },
      };

      const expression = `
        Object.entries($.environments.value)
          .map(([env, config]) => ({
            environment: env,
            hasCache: config.features.cache,
            ports: [config.database.port, config.redis.port]
          }))
      `;

      const result = await processor.process(expression, JSON.stringify(configData));

      expect(result.data).toEqual([
        { environment: 'development', hasCache: false, ports: [5432, 6379] },
        { environment: 'production', hasCache: true, ports: [5432, 6379] },
      ]);
    });
  });

  describe('Performance considerations', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = {
        records: Array.from({ length: 5000 }, (_, i) => ({
          id: i,
          value: Math.random(),
          category: i % 10,
          timestamp: Date.now() + i * 1000,
        })),
      };

      const expression = `
        $.records
          .filter(r => r.value > 0.8)
          .sortBy('timestamp')
          .take(10)
          .pluck('id')
      `;

      const startTime = Date.now();
      const result = await processor.process(expression, JSON.stringify(largeDataset));
      const processingTime = Date.now() - startTime;

      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeLessThanOrEqual(10);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should provide accurate size measurements', async () => {
      const testData = { message: 'Hello, World!', numbers: [1, 2, 3, 4, 5] };
      const input = JSON.stringify(testData);
      const expression = '$.message.value.length';

      const result = await processor.process(expression, input);

      expect(result.metadata.inputSize).toBe(input.length);
      expect(result.metadata.outputSize).toBe(JSON.stringify(result.data).length);
    });
  });

  describe('Stream processing (placeholder)', () => {
    it('should handle stream processing without errors', async () => {
      const mockStream = {
        readable: true,
        on: jest.fn(),
        once: jest.fn(),
        removeListener: jest.fn(),
        pipe: jest.fn(),
      } as NodeJS.ReadableStream;
      const expression = '$.test';

      const result = processor.processStream(expression, mockStream);
      expect(result).toBeDefined();
    });
  });

  describe('Integration with different modes', () => {
    it('should work correctly in verbose mode', async () => {
      const verboseProcessor = new JsqProcessor({ ...mockOptions, verbose: true });
      const input = '{"test": "data"}';
      const expression = '$.test';

      const result = await verboseProcessor.process(expression, input);

      expect(result.data).toBe('data');
      expect(result.metadata).toBeDefined();
    });

    it('should work correctly in unsafe mode', async () => {
      const unsafeProcessor = new JsqProcessor({ ...mockOptions, unsafe: true });
      const input = '{"numbers": [1, 2, 3, 4, 5]}';
      const expression = '$.numbers.value.reduce((sum, n) => sum + n, 0)';

      const result = await unsafeProcessor.process(expression, input);

      expect(result.data).toBe(15);
    });

    it('should work correctly with debug metadata', async () => {
      const debugProcessor = new JsqProcessor({ ...mockOptions, debug: true });
      const input = '{"array": [1, 2, 3]}';
      const expression = '$.array.length()';

      const result = await debugProcessor.process(expression, input);

      expect(result.data).toBe(3);
      expect(result.metadata.steps).toBeDefined();
      expect(result.metadata.steps.length).toBeGreaterThan(0);
    });
  });
});
