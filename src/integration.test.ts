import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

describe('Integration Tests', () => {
  const jsqBinary = path.join(__dirname, '../dist/index.js');
  let childProcess: ChildProcess | null = null;

  afterEach(() => {
    if (childProcess) {
      childProcess.kill();
      childProcess = null;
    }
  });

  // Helper function to run jsq with input and get output
  const runJsq = (expression: string, input: string, options: string[] = []): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
    return new Promise((resolve) => {
      const args = [...options, expression];
      childProcess = spawn('node', [jsqBinary, ...args], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code) => {
        resolve({ stdout, stderr, exitCode: code || 0 });
      });

      // Send input to stdin
      if (childProcess.stdin) {
        childProcess.stdin.write(input);
        childProcess.stdin.end();
      }
    });
  };

  describe('Basic CLI functionality', () => {
    it('should process simple JSON with $ syntax', async () => {
      const input = '{"name": "Alice", "age": 30}';
      const expression = '$.name';
      
      const result = await runJsq(expression, input);
      
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe('Alice');
    }, 10000);

    it('should process array operations', async () => {
      const input = JSON.stringify([
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 35 }
      ]);
      const expression = '$.filter(u => u.age > 27).pluck("name")';
      
      const result = await runJsq(expression, input);
      
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(['Alice', 'Charlie']);
    }, 10000);

    it('should handle complex chaining operations', async () => {
      const input = JSON.stringify({
        users: [
          { name: 'Alice', age: 30, department: 'engineering', salary: 70000 },
          { name: 'Bob', age: 25, department: 'design', salary: 50000 },
          { name: 'Charlie', age: 35, department: 'engineering', salary: 80000 },
          { name: 'David', age: 28, department: 'marketing', salary: 60000 }
        ]
      });
      
      const expression = '$.users.filter(u => u.department === "engineering").sortBy("salary").pluck("name")';
      
      const result = await runJsq(expression, input);
      
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(['Alice', 'Charlie']);
    }, 10000);
  });

  describe('CLI options', () => {
    it('should work with verbose flag', async () => {
      const input = '{"test": "data"}';
      const expression = '$.test';
      
      const result = await runJsq(expression, input, ['-v']);
      
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe('data');
      expect(result.stderr).toContain('🔒 Running in secure VM mode');
      expect(result.stderr).toContain('Processing time:');
    }, 10000);

    it('should work with unsafe flag', async () => {
      const input = '{"numbers": [1, 2, 3, 4, 5]}';
      const expression = '$.numbers.reduce((sum, n) => sum + n, 0)';
      
      const result = await runJsq(expression, input, ['--unsafe', '-v']);
      
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe(15);
      expect(result.stderr).toContain('⚡ Running in unsafe mode');
    }, 10000);

    it('should work with debug flag', async () => {
      const input = '{"array": [1, 2, 3]}';
      const expression = '$.array.length()';
      
      const result = await runJsq(expression, input, ['-d', '-v']);
      
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe(3);
      expect(result.stderr).toContain('Steps:');
    }, 10000);
  });

  describe('Error handling', () => {
    it('should handle invalid JSON input', async () => {
      const input = '{invalid json}';
      const expression = '$.test';
      
      const result = await runJsq(expression, input);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Error:');
    }, 10000);

    it('should handle invalid expressions', async () => {
      const input = '{"valid": "json"}';
      const expression = 'invalid.expression+++';
      
      const result = await runJsq(expression, input);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Error:');
    }, 10000);

    it('should handle missing expression argument', async () => {
      const input = '{"test": "data"}';
      
      const result = await runJsq('', input);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('No expression provided');
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
            topics: ['javascript', 'typescript', 'cli']
          },
          {
            id: 2,
            name: 'cool-library',
            full_name: 'user/cool-library',
            description: 'A cool library',
            stargazers_count: 890,
            language: 'JavaScript',
            topics: ['javascript', 'library']
          },
          {
            id: 3,
            name: 'useful-tool',
            full_name: 'user/useful-tool',
            description: 'A useful tool',
            stargazers_count: 2100,
            language: 'TypeScript',
            topics: ['typescript', 'tool', 'cli']
          }
        ]
      };

      const expression = '$.items.filter(repo => repo.language === "TypeScript").sortBy("stargazers_count").pluck("name")';
      
      const result = await runJsq(expression, JSON.stringify(githubApiResponse));
      
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(['awesome-project', 'useful-tool']);
    }, 10000);

    it('should process log analysis scenario', async () => {
      const logData = {
        logs: Array.from({ length: 100 }, (_, i) => ({
          timestamp: `2023-01-01T${String(10 + Math.floor(i / 10)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z`,
          level: ['info', 'warn', 'error'][i % 3],
          service: ['api', 'db', 'cache'][i % 3],
          message: `Message ${i}`
        }))
      };

      const expression = `
        $.logs
          .filter(log => log.level === 'error')
          .take(5)
          .pluck('service')
      `;
      
      const result = await runJsq(expression, JSON.stringify(logData));
      
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
              { product: 'mouse', quantity: 2, price: 29.99 }
            ],
            status: 'completed'
          },
          {
            id: 'order_2',
            customer: { name: 'Bob', region: 'EU' },
            items: [
              { product: 'keyboard', quantity: 1, price: 79.99 },
              { product: 'monitor', quantity: 1, price: 299.99 }
            ],
            status: 'pending'
          }
        ]
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
      
      const result = await runJsq(expression, JSON.stringify(ecommerceData));
      
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output).toEqual([{
        orderId: 'order_1',
        customer: 'Alice',
        total: 1059.97 // 999.99 + (2 * 29.99)
      }]);
    }, 10000);
  });

  describe('Performance tests', () => {
    it('should handle reasonably large datasets', async () => {
      const largeDataset = {
        records: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: Math.random(),
          category: `cat_${i % 10}`,
          timestamp: Date.now() + i * 1000
        }))
      };

      const expression = '$.records.filter(r => r.value > 0.5).length()';
      
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

    it('should support mixed $ and data syntax', async () => {
      const input = '{"users": [{"name": "Alice"}, {"name": "Bob"}]}';
      const expression = '$.users.map(u => u.name).concat([data.users[0].name])';
      
      const result = await runJsq(expression, input);
      
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(['Alice', 'Bob', 'Alice']);
    }, 10000);
  });

  describe('Security validation', () => {
    it('should block dangerous operations in VM mode', async () => {
      const input = '{"test": "data"}';
      const expression = 'process.exit()'; // Dangerous operation
      
      const result = await runJsq(expression, input);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Error:');
    }, 10000);

    it('should show security warnings for unsafe mode with verbose', async () => {
      const input = '{"test": "data"}';
      const expression = '$.test';
      
      const result = await runJsq(expression, input, ['--unsafe', '-v']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('⚡ Running in unsafe mode');
    }, 10000);
  });
});