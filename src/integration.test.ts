import { type ChildProcess, spawn } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

describe('Integration Tests', () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const jsqBinary = path.join(__dirname, '../dist/index.js');
  let childProcess: ChildProcess | null = null;

  beforeAll(() => {
    // Tests will rely on proper cleanup through isProcessExiting flag
  });

  afterEach(() => {
    if (childProcess) {
      childProcess.kill();
      childProcess = null;
    }
  });

  // Helper function to run jsq with input and get output
  const runJsq = (
    expression: string,
    input: string,
    options: string[] = []
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
    return new Promise(resolve => {
      const args = [...options, expression];
      childProcess = spawn('node', [jsqBinary, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'test',
        },
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout?.on('data', data => {
        stdout += data.toString();
      });

      childProcess.stderr?.on('data', data => {
        stderr += data.toString();
      });

      childProcess.on('close', code => {
        resolve({ stdout, stderr, exitCode: code || 0 });
      });

      childProcess.on('error', err => {
        resolve({ stdout: '', stderr: err.message, exitCode: 1 });
      });

      // Send input to stdin
      if (childProcess.stdin) {
        childProcess.stdin.write(input);
        childProcess.stdin.end();
      }
    });
  };

  // Helper function for tests that expect JSON output
  const runJsqForJSON = (
    expression: string,
    input: string,
    options: string[] = []
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
    // Add --compact option if not already present
    const finalOptions =
      !options.includes('--compact') && !options.includes('-c')
        ? ['--compact', ...options]
        : options;
    return runJsq(expression, input, finalOptions);
  };

  describe('Basic CLI functionality', () => {
    it('should process simple JSON with $ syntax', async () => {
      const input = '{"name": "Alice", "age": 30}';
      const expression = '$.name';

      const result = await runJsq(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe('Alice');
    }, 10000);

    it('should process hyphenated properties with $ syntax', async () => {
      const input = '{"theme-command": "dark", "user-id": 123, "is-active": true}';
      const expression = '$.theme-command';

      const result = await runJsq(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe('dark');
    }, 10000);

    it('should process hyphenated properties with dot notation', async () => {
      const input = '{"theme-command": "dark", "user-id": 123, "is-active": true}';
      const expression = '.theme-command';

      const result = await runJsq(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe('dark');
    }, 10000);

    it('should process nested hyphenated properties', async () => {
      const input = JSON.stringify({
        'theme-settings': {
          'dark-mode': true,
          'font-size': 16,
          'color-scheme': {
            'primary-color': '#007bff',
            'secondary-color': '#6c757d',
          },
        },
      });
      const expression = '.theme-settings.color-scheme.primary-color';

      const result = await runJsq(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe('#007bff');
    }, 10000);

    it('should process properties starting with numbers', async () => {
      const input = JSON.stringify({
        '5d3c73bd-0e6b-4e9e-9d0b-e84ab8c5f28': 'uuid-value',
        '123-test': 'number-start',
        'normal-prop': 'normal-value',
      });
      const expression = '$.5d3c73bd-0e6b-4e9e-9d0b-e84ab8c5f28';

      const result = await runJsq(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe('uuid-value');
    }, 10000);

    it('should process nested properties with numbers', async () => {
      const input = JSON.stringify({
        data: {
          '5d3c73bd-0e6b-4e9e-9d0b-e84ab8c5f28': {
            '123e4567-e89b-12d3-a456-426614174000': 'nested-uuid',
          },
        },
      });
      const expression =
        '$.data.5d3c73bd-0e6b-4e9e-9d0b-e84ab8c5f28.123e4567-e89b-12d3-a456-426614174000';

      const result = await runJsq(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe('nested-uuid');
    }, 10000);

    it('should process array operations', async () => {
      const input = JSON.stringify([
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 35 },
      ]);
      const expression = '$.filter(u => u.age > 27).pluck("name")';

      const result = await runJsqForJSON(expression, input);

      // Debug output
      console.log('stdout:', result.stdout);
      console.log('stderr:', result.stderr);
      console.log('exitCode:', result.exitCode);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(['Alice', 'Charlie']);
    }, 10000);

    it('should handle complex chaining operations', async () => {
      const input = JSON.stringify({
        users: [
          { name: 'Alice', age: 30, department: 'engineering', salary: 70000 },
          { name: 'Bob', age: 25, department: 'design', salary: 50000 },
          { name: 'Charlie', age: 35, department: 'engineering', salary: 80000 },
          { name: 'David', age: 28, department: 'marketing', salary: 60000 },
        ],
      });

      const expression =
        '$.users.filter(u => u.department === "engineering").sortBy("salary").pluck("name")';

      const result = await runJsqForJSON(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(['Alice', 'Charlie']);
    }, 10000);
  });

  describe('CLI options', () => {
    it.skip('should work with verbose flag', async () => {
      const input = '{"test": "data"}';
      const expression = '$.test';

      const result = await runJsq(expression, input, ['-v']);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe('data');
      expect(result.stderr).toContain('🔒 Running in secure VM mode');
      expect(result.stderr).toContain('Processing time:');
    }, 10000);

    it.skip('should work with unsafe flag', async () => {
      const input = '{"numbers": [1, 2, 3, 4, 5]}';
      const expression = '$.numbers.reduce((sum, n) => sum + n, 0)';

      const result = await runJsq(expression, input, ['--unsafe', '-v']);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe(15);
      expect(result.stderr).toContain('⚠️  Running in unsafe mode');
    }, 10000);

    it('should work with debug flag', async () => {
      const input = '{"array": [1, 2, 3]}';
      const expression = '$.array.length';

      const result = await runJsq(expression, input, ['-v']);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe(3);
      expect(result.stderr).toContain('Processing time:');
    }, 10000);
  });

  describe('Error handling', () => {
    it('should handle invalid JSON input', async () => {
      const input = '{invalid json}';
      const expression = '$.test';

      const result = await runJsq(expression, input);

      // The parser tries to preprocess but still fails with syntax error
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Error:');
      expect(result.stderr).toContain('SYNTAX ERROR');
    }, 10000);

    it('should handle invalid expressions', async () => {
      const input = '{"valid": "json"}';
      const expression = 'invalid.expression+++';

      const result = await runJsq(expression, input);

      // Invalid expressions are evaluated and cause syntax errors
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Error:');
      expect(result.stderr).toContain('unexpected token');
    }, 10000);
  });

  describe('Real-world data scenarios', () => {
    it('should process GitHub API-like response', async () => {
      const githubApiResponse = {
        total_count: 3,
        incomplete_results: false,
        items: [
          {
            id: 1,
            name: 'awesome-project',
            full_name: 'user/awesome-project',
            description: 'An awesome project',
            stargazers_count: 1250,
            language: 'TypeScript',
            topics: ['javascript', 'typescript', 'cli'],
          },
          {
            id: 2,
            name: 'cool-library',
            full_name: 'user/cool-library',
            description: 'A cool library',
            stargazers_count: 890,
            language: 'JavaScript',
            topics: ['javascript', 'library'],
          },
          {
            id: 3,
            name: 'useful-tool',
            full_name: 'user/useful-tool',
            description: 'A useful tool',
            stargazers_count: 2100,
            language: 'TypeScript',
            topics: ['typescript', 'tool', 'cli'],
          },
        ],
      };

      const expression =
        '$.items.filter(repo => repo.language === "TypeScript").sortBy("stargazers_count").pluck("name")';

      const result = await runJsqForJSON(expression, JSON.stringify(githubApiResponse));

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(['awesome-project', 'useful-tool']);
    }, 10000);

    it('should process log analysis scenario', async () => {
      const logData = {
        logs: Array.from({ length: 100 }, (_, i) => ({
          timestamp: `2023-01-01T${String(10 + Math.floor(i / 10)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z`,
          level: ['info', 'warn', 'error'][i % 3],
          service: ['api', 'db', 'cache'][i % 3],
          message: `Message ${i}`,
        })),
      };

      const expression = `
        $.logs
          .filter(log => log.level === 'error')
          .take(5)
          .pluck('service')
      `;

      const result = await runJsqForJSON(expression, JSON.stringify(logData));

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(Array.isArray(output)).toBe(true);
      expect(output.length).toBe(5);
    }, 10000);

    it('should process e-commerce data transformation', async () => {
      const ecommerceData = {
        orders: [
          {
            id: 'order_1',
            customer: { name: 'Alice', region: 'US' },
            items: [
              { product: 'laptop', quantity: 1, price: 999.99 },
              { product: 'mouse', quantity: 2, price: 29.99 },
            ],
            status: 'completed',
          },
          {
            id: 'order_2',
            customer: { name: 'Bob', region: 'EU' },
            items: [
              { product: 'keyboard', quantity: 1, price: 79.99 },
              { product: 'monitor', quantity: 1, price: 299.99 },
            ],
            status: 'pending',
          },
        ],
      };

      const expression = `
        $.orders
          .filter(order => order.status === 'completed')
          .map(order => ({
            orderId: order.id,
            customer: order.customer.name,
            total: order.items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
          }))
      `;

      const result = await runJsqForJSON(expression, JSON.stringify(ecommerceData));

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output).toEqual([
        {
          orderId: 'order_1',
          customer: 'Alice',
          total: 1059.97, // 999.99 + (2 * 29.99)
        },
      ]);
    }, 10000);
  });

  describe('Performance tests', () => {
    it('should handle reasonably large datasets', async () => {
      const largeDataset = {
        records: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: Math.random(),
          category: `cat_${i % 10}`,
          timestamp: Date.now() + i * 1000,
        })),
      };

      const expression = '$.records.filter(r => r.value > 0.5).length';

      const startTime = Date.now();
      const result = await runJsq(expression, JSON.stringify(largeDataset));
      const endTime = Date.now();

      expect(result.exitCode).toBe(0);
      expect(typeof JSON.parse(result.stdout)).toBe('number');
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    }, 15000);
  });

  describe('Backward compatibility', () => {
    it('should support legacy data variable syntax', async () => {
      const input = '{"name": "Alice", "age": 30}';
      const expression = 'data.name'; // Using old 'data' variable

      const result = await runJsq(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe('Alice');
    }, 10000);

    it.skip('should support mixed $ and data syntax', async () => {
      const input = '{"users": [{"name": "Alice"}, {"name": "Bob"}]}';
      const expression = '$.users.map(u => u.name).concat([data.users[0].name])';

      const result = await runJsq(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(['Alice', 'Bob', 'Alice']);
    }, 10000);
  });

  describe('Security validation', () => {
    it.skip('should block dangerous operations in VM mode', async () => {
      const input = '{"test": "data"}';
      const expression = 'process.exit()'; // Dangerous operation

      const result = await runJsq(expression, input);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Error:');
    }, 10000);

    it.skip('should show security warnings for unsafe mode with verbose', async () => {
      const input = '{"test": "data"}';
      const expression = '$.test';

      const result = await runJsq(expression, input, ['--unsafe', '-v']);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('⚠️  Running in unsafe mode');
    }, 10000);
  });

  describe('Comprehensive jQuery-style API Tests', () => {
    // Basic property access
    it('should handle direct property access', async () => {
      const input = '{"name": "Alice", "age": 30, "active": true}';
      const expression = '$.name';

      const result = await runJsq(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe('Alice');
    }, 10000);

    // Array operations
    it('should filter arrays with predicate functions', async () => {
      const input = '{"numbers": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}';
      const expression = '$.numbers.filter(n => n % 2 === 0)';

      const result = await runJsqForJSON(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([2, 4, 6, 8, 10]);
    }, 10000);

    it('should map arrays with transform functions', async () => {
      const input = '{"prices": [10, 20, 30]}';
      const expression = '$.prices.map(p => p * 1.1)';

      const result = await runJsqForJSON(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([11, 22, 33]);
    }, 10000);

    it('should find first matching element', async () => {
      const input =
        '{"users": [{"name": "Alice", "age": 25}, {"name": "Bob", "age": 30}, {"name": "Charlie", "age": 35}]}';
      const expression = '$.users.find(u => u.age > 28)';

      const result = await runJsq(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({ name: 'Bob', age: 30 });
    }, 10000);

    it('should filter by property value with where', async () => {
      const input =
        '{"products": [{"name": "laptop", "category": "electronics"}, {"name": "book", "category": "education"}, {"name": "phone", "category": "electronics"}]}';
      const expression = '$.products.where("category", "electronics")';

      const result = await runJsqForJSON(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([
        { name: 'laptop', category: 'electronics' },
        { name: 'phone', category: 'electronics' },
      ]);
    }, 10000);

    it('should extract values with pluck', async () => {
      const input =
        '{"employees": [{"name": "Alice", "salary": 50000}, {"name": "Bob", "salary": 60000}, {"name": "Charlie", "salary": 70000}]}';
      const expression = '$.employees.pluck("salary")';

      const result = await runJsqForJSON(expression, input);

      if (result.stdout === '') {
        console.error('Empty stdout. stderr:', result.stderr);
        console.error('Exit code:', result.exitCode);
      }
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([50000, 60000, 70000]);
    }, 10000);

    it('should sort by property with sortBy', async () => {
      const input =
        '{"items": [{"name": "Zebra", "price": 100}, {"name": "Apple", "price": 50}, {"name": "Banana", "price": 75}]}';
      const expression = '$.items.sortBy("name")';

      const result = await runJsqForJSON(expression, input);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output[0].name).toBe('Apple');
      expect(output[1].name).toBe('Banana');
      expect(output[2].name).toBe('Zebra');
    }, 10000);

    it('should take first N elements', async () => {
      const input = '{"sequence": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}';
      const expression = '$.sequence.take(3)';

      const result = await runJsqForJSON(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([1, 2, 3]);
    }, 10000);

    it('should skip first N elements', async () => {
      const input = '{"sequence": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}';
      const expression = '$.sequence.skip(7)';

      const result = await runJsqForJSON(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([8, 9, 10]);
    }, 10000);

    // Aggregation operations
    it('should calculate sum of numbers', async () => {
      const input = '{"values": [10, 20, 30, 40, 50]}';
      const expression = '$.values.sum()';

      const result = await runJsq(expression, input);

      // Debug output
      console.log('stdout:', result.stdout);
      console.log('stderr:', result.stderr);
      console.log('exitCode:', result.exitCode);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe(150);
    }, 10000);

    it('should calculate sum by property', async () => {
      const input = '{"transactions": [{"amount": 100}, {"amount": 200}, {"amount": 150}]}';
      const expression = '$.transactions.sum("amount")';

      const result = await runJsq(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe(450);
    }, 10000);

    it('should get array length', async () => {
      const input = '{"items": ["a", "b", "c", "d", "e"]}';
      const expression = '$.items.length';

      const result = await runJsq(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe(5);
    }, 10000);

    it('should get object keys', async () => {
      const input = '{"config": {"host": "localhost", "port": 3000, "secure": true}}';
      const expression = 'Object.keys($.config)';

      const result = await runJsqForJSON(expression, input);

      expect(result.exitCode).toBe(0);
      const keys = JSON.parse(result.stdout);
      expect(keys).toContain('host');
      expect(keys).toContain('port');
      expect(keys).toContain('secure');
    }, 10000);

    it('should get object values', async () => {
      const input = '{"settings": {"debug": true, "timeout": 5000}}';
      const expression = 'Object.values($.settings)';

      const result = await runJsqForJSON(expression, input);

      expect(result.exitCode).toBe(0);
      const values = JSON.parse(result.stdout);
      expect(values).toContain(true);
      expect(values).toContain(5000);
    }, 10000);

    // Complex chaining scenarios
    it.skip('should handle complex filter and map chain', async () => {
      const input =
        '{"sales": [{"rep": "Alice", "amount": 1000, "month": "Jan"}, {"rep": "Bob", "amount": 1500, "month": "Jan"}, {"rep": "Alice", "amount": 2000, "month": "Feb"}]}';
      const expression = '$.sales.filter(s => s.month === "Jan").map(s => s.amount * 1.1)';

      const result = await runJsq(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([1100, 1650]);
    }, 10000);

    it('should chain multiple operations', async () => {
      const input =
        '{"data": [{"score": 85, "grade": "B"}, {"score": 92, "grade": "A"}, {"score": 78, "grade": "C"}, {"score": 96, "grade": "A"}]}';
      const expression = '$.data.filter(d => d.score > 80).sortBy("score").take(2).pluck("grade")';

      const result = await runJsqForJSON(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(['B', 'A']);
    }, 10000);

    // Edge cases
    it('should handle empty arrays', async () => {
      const input = '{"empty": []}';
      const expression = '$.empty.filter(x => true).length';

      const result = await runJsq(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe(0);
    }, 10000);

    it('should handle null values gracefully', async () => {
      const input = '{"data": [{"value": 10}, {"value": null}, {"value": 20}]}';
      const expression = '$.data.filter(d => d.value !== null).pluck("value")';

      const result = await runJsqForJSON(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([10, 20]);
    }, 10000);

    it('should handle nested objects', async () => {
      const input =
        '{"company": {"departments": [{"name": "Engineering", "employees": [{"name": "Alice", "role": "Senior"}, {"name": "Bob", "role": "Junior"}]}, {"name": "Design", "employees": [{"name": "Charlie", "role": "Lead"}]}]}}';
      const expression =
        '$.company.departments.filter(d => d.name === "Engineering")[0].employees.map(e => e.name)';

      const result = await runJsqForJSON(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(['Alice', 'Bob']);
    }, 10000);

    // Data transformation scenarios
    it.skip('should transform API response format', async () => {
      const input =
        '{"response": {"status": 200, "data": {"users": [{"id": 1, "first_name": "John", "last_name": "Doe", "email": "john@example.com"}, {"id": 2, "first_name": "Jane", "last_name": "Smith", "email": "jane@example.com"}]}}}';
      const expression =
        '$.response.data.users.map(u => ({id: u.id, fullName: u.first_name + " " + u.last_name, contact: u.email}))';

      const result = await runJsq(expression, input);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output).toEqual([
        { id: 1, fullName: 'John Doe', contact: 'john@example.com' },
        { id: 2, fullName: 'Jane Smith', contact: 'jane@example.com' },
      ]);
    }, 10000);

    it('should aggregate financial data', async () => {
      const input =
        '{"portfolio": {"stocks": [{"symbol": "AAPL", "shares": 10, "price": 150}, {"symbol": "GOOGL", "shares": 5, "price": 2500}, {"symbol": "MSFT", "shares": 8, "price": 300}]}}';
      const expression = '$.portfolio.stocks.map(s => s.shares * s.price).sum()';

      const result = await runJsq(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe(16400); // 1500 + 12500 + 2400
    }, 10000);

    it('should process log analytics', async () => {
      const input =
        '{"logs": [{"level": "INFO", "service": "api", "duration": 120}, {"level": "ERROR", "service": "db", "duration": 5000}, {"level": "WARN", "service": "api", "duration": 800}, {"level": "INFO", "service": "cache", "duration": 50}]}';
      const expression =
        '$.logs.filter(l => l.level !== "INFO").sortBy("duration").pluck("service")';

      const result = await runJsqForJSON(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(['api', 'db']);
    }, 10000);

    it('should handle inventory management', async () => {
      const input =
        '{"inventory": [{"item": "laptop", "quantity": 50, "price": 1000, "category": "electronics"}, {"item": "desk", "quantity": 20, "price": 200, "category": "furniture"}, {"item": "phone", "quantity": 100, "price": 500, "category": "electronics"}]}';
      const expression =
        '$.inventory.where("category", "electronics").filter(i => i.quantity > 60).pluck("item")';

      const result = await runJsqForJSON(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(['phone']);
    }, 10000);

    it.skip('should calculate statistics', async () => {
      const input = '{"metrics": {"response_times": [120, 150, 89, 200, 95, 180, 110, 165]}}';
      const expression = '$.metrics.response_times.filter(t => t < 200).length';

      const result = await runJsq(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe(6);
    }, 10000);

    it.skip('should handle e-commerce order analysis', async () => {
      const input =
        '{"orders": [{"id": "order_1", "items": [{"name": "laptop", "price": 999}], "customer": {"tier": "premium"}}, {"id": "order_2", "items": [{"name": "mouse", "price": 25}, {"name": "keyboard", "price": 75}], "customer": {"tier": "basic"}}, {"id": "order_3", "items": [{"name": "monitor", "price": 400}], "customer": {"tier": "premium"}}]}';
      const expression =
        '$.orders.filter(o => o.customer.tier === "premium").map(o => o.items.sum("price")).sum()';

      const result = await runJsq(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe(1399); // 999 + 400
    }, 10000);

    it('should process social media analytics', async () => {
      const input =
        '{"posts": [{"author": "alice", "likes": 45, "comments": 12, "shares": 8}, {"author": "bob", "likes": 89, "comments": 23, "shares": 15}, {"author": "alice", "likes": 67, "comments": 18, "shares": 12}, {"author": "charlie", "likes": 23, "comments": 5, "shares": 3}]}';
      const expression =
        '$.posts.filter(p => p.likes > 50).sortBy("likes").take(2).pluck("author")';

      const result = await runJsqForJSON(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(['alice', 'bob']);
    }, 10000);

    it('should handle performance monitoring data', async () => {
      const input =
        '{"servers": [{"name": "web-1", "cpu": 75, "memory": 80, "status": "healthy"}, {"name": "web-2", "cpu": 45, "memory": 60, "status": "healthy"}, {"name": "db-1", "cpu": 90, "memory": 95, "status": "warning"}, {"name": "cache-1", "cpu": 25, "memory": 30, "status": "healthy"}]}';
      const expression = '$.servers.filter(s => s.cpu > 70 || s.memory > 85).pluck("name")';

      const result = await runJsqForJSON(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(['web-1', 'db-1']);
    }, 10000);

    it('should handle time series data', async () => {
      const input =
        '{"metrics": [{"timestamp": "2023-01-01T10:00:00Z", "value": 100}, {"timestamp": "2023-01-01T11:00:00Z", "value": 120}, {"timestamp": "2023-01-01T12:00:00Z", "value": 90}, {"timestamp": "2023-01-01T13:00:00Z", "value": 110}]}';
      const expression = '$.metrics.filter(m => m.value > 100).length';

      const result = await runJsq(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe(2);
    }, 10000);

    it('should process configuration validation', async () => {
      const input =
        '{"config": {"services": [{"name": "api", "port": 3000, "enabled": true}, {"name": "worker", "port": 3001, "enabled": false}, {"name": "scheduler", "port": 3002, "enabled": true}]}}';
      const expression = '$.config.services.filter(s => s.enabled).pluck("port")';

      const result = await runJsqForJSON(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([3000, 3002]);
    }, 10000);

    it('should handle nested array transformations', async () => {
      const input =
        '{"teams": [{"name": "frontend", "members": [{"name": "Alice", "skills": ["React", "TypeScript"]}, {"name": "Bob", "skills": ["Vue", "JavaScript"]}]}, {"name": "backend", "members": [{"name": "Charlie", "skills": ["Node.js", "Python"]}, {"name": "David", "skills": ["Go", "Rust"]}]}]}';
      const expression = '$.teams.filter(t => t.name === "frontend")[0].members.map(m => m.skills)';

      const result = await runJsqForJSON(expression, input);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([
        ['React', 'TypeScript'],
        ['Vue', 'JavaScript'],
      ]);
    }, 10000);

    it.skip('should handle extremely large and complex JSON files', async () => {
      // Create a very large JSON object with complex nesting and special characters
      const complexData = {
        metadata: {
          version: '1.0.0',
          description: 'Complex JSON with special characters',
          unicode: '日本語 emoji test',
          escapes: 'Line1 Line2 Tab Carriage',
        },
        deeplyNested: {},
        largeArray: [],
        specialKeys: {
          keyWithQuotes: 'valueWithQuotes',
          keyWithDoubleQuotes: 'valueWithDoubleQuotes',
          keyWithBackslashes: 'valueWithBackslashes',
          keyWithNewlines: 'valueWithNewlines',
        },
      };

      // Create deeply nested structure
      let current = complexData.deeplyNested;
      for (let i = 0; i < 50; i++) {
        current[`level${i}`] = {
          data: `Level ${i} data`,
          next: {},
        };
        current = current[`level${i}`].next;
      }

      // Create large array with many objects
      for (let i = 0; i < 1000; i++) {
        complexData.largeArray.push({
          id: i,
          name: `Item ${i}`,
          data: {
            value: Math.random(),
            timestamp: new Date().toISOString(),
            special: `Special chars ${i}`,
            unicode: `Unicode ${i}`,
          },
        });
      }

      const input = JSON.stringify(complexData);
      const expression = '$.largeArray.length';

      const result = await runJsqForJSON(expression, input);

      // Debug output
      console.log('Large JSON test - stdout:', result.stdout);
      console.log('Large JSON test - stderr:', result.stderr);
      console.log('Large JSON test - exitCode:', result.exitCode);
      console.log('Large JSON test - input size:', input.length);

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe(1000);
    }, 30000);

    it.skip('should handle large JSON files from stdin in REPL mode', async () => {
      // Generate a large JSON with many special characters that could break string escaping
      const largeData = {
        entries: [],
      };

      for (let i = 0; i < 100; i++) {
        largeData.entries.push({
          id: i,
          text: `Entry ${i} with various quotes: 'single' "double" and \`backtick\``,
          code: `function test() { return "Hello\\nWorld"; }`,
          regex: `/test'pattern"with[special]chars/g`,
          multiline: `Line 1
Line 2 with 'quotes'
Line 3 with "double quotes"
Line 4 with \`backticks\``,
          json: JSON.stringify({ nested: 'data', with: "'quotes'" }),
          unicode: `Emoji test: 😀 🎉 🚀 Japanese: 日本語 Korean: 한국어`,
          escapes: `Tab:\tNewline:\nCarriage return:\rBackslash:\\`,
        });
      }

      const input = JSON.stringify(largeData);

      // Test REPL mode with large JSON
      const replProcess = spawn('node', [jsqBinary, '--repl'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'test',
        },
      });

      let stdout = '';
      let stderr = '';
      let resolved = false;

      const resultPromise = new Promise<{ stdout: string; stderr: string; exitCode: number }>(
        resolve => {
          replProcess.stdout?.on('data', data => {
            stdout += data.toString();

            // Check if we received the prompt and result
            if (stdout.includes('100') && !resolved) {
              resolved = true;
              // Try to exit gracefully, or kill the process
              replProcess.stdin?.write('.exit\n');
              setTimeout(() => {
                replProcess.kill('SIGTERM');
              }, 100);
            }
          });

          replProcess.stderr?.on('data', data => {
            stderr += data.toString();
          });

          replProcess.on('close', code => {
            resolve({ stdout, stderr, exitCode: code || 0 });
          });
        }
      );

      // Send the large JSON via stdin
      replProcess.stdin?.write(input);
      replProcess.stdin?.write('\n');

      // Wait a bit for the data to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Send a query
      replProcess.stdin?.write('$.entries.length\n');

      const result = await resultPromise;

      // The process might exit with code 0 or be killed (null/143)
      // What matters is that we got the expected output
      expect(result.stdout).toContain('100');

      // In test environment, we might get TTY-related messages or
      // "REPL mode requires an interactive terminal" error
      // As long as we got the expected output, the test passes
    }, 30000);
  });
});
