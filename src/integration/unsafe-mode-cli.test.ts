import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

describe.skip('Unsafe Mode CLI Integration Tests', () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const binPath = join(__dirname, '../../bin/jsq');
  const testDir = join(__dirname, 'test-output');

  beforeAll(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
  });

  const runJsq = (
    expression: string,
    options: { unsafe?: boolean; input?: string } = {}
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
    return new Promise(resolve => {
      const args = [binPath];
      if (options.unsafe) {
        args.push('--unsafe');
      }
      args.push(expression);

      const child = spawn('node', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', data => {
        stdout += data.toString();
      });

      child.stderr?.on('data', data => {
        stderr += data.toString();
      });

      child.on('close', code => {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0,
        });
      });

      if (options.input) {
        child.stdin?.write(options.input);
      }
      child.stdin?.end();
    });
  };

  describe('Basic $ and Property Access Tests', () => {
    it('should evaluate $ directly in unsafe mode', async () => {
      const input = '{"name": "Alice", "age": 30}';
      const result = await runJsq('$', { unsafe: true, input });

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({ name: 'Alice', age: 30 });
    });

    it('should access nested properties with $ in unsafe mode', async () => {
      const input = '{"user": {"name": "Bob", "details": {"city": "Tokyo", "country": "Japan"}}}';
      const result = await runJsq('$.user.details.city', { unsafe: true, input });

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe('Tokyo');
    });

    it('should handle array access with $ in unsafe mode', async () => {
      const input = '["apple", "banana", "orange"]';
      const result = await runJsq('$[1]', { unsafe: true, input });

      if (result.exitCode !== 0) {
        console.error('Array access test failed:', result.stderr);
        console.error('stdout:', result.stdout);
      }

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe('banana');
    });

    it('should handle null/undefined gracefully in unsafe mode', async () => {
      const input = '{"value": null}';
      const result = await runJsq('data.value?.nonexistent?.property || "default"', {
        unsafe: true,
        input,
      });

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe('default');
    });

    it('should work with data variable for backward compatibility', async () => {
      const input = '{"count": 42}';
      const result = await runJsq('data.count * 2', { unsafe: true, input });

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe(84);
    });
  });

  describe('Array Manipulation Tests', () => {
    it('should use map with $ in unsafe mode', async () => {
      const input = '[1, 2, 3, 4, 5]';
      const result = await runJsq('$.map(x => x * 2)', { unsafe: true, input });

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([2, 4, 6, 8, 10]);
    });

    it('should use filter with $ in unsafe mode', async () => {
      const input = '{"numbers": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}';
      const result = await runJsq('$.numbers.filter(n => n % 2 === 0)', { unsafe: true, input });

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([2, 4, 6, 8, 10]);
    });

    it('should use reduce with $ in unsafe mode', async () => {
      const input = '[1, 2, 3, 4, 5]';
      const result = await runJsq('$.reduce((sum, n) => sum + n, 0)', { unsafe: true, input });

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe(15);
    });

    it('should chain array methods in unsafe mode', async () => {
      const input = '{"data": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}';
      const result = await runJsq('$.data.filter(n => n > 5).map(n => n * 2)', {
        unsafe: true,
        input,
      });

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([12, 14, 16, 18, 20]);
    });
  });

  describe('jQuery-style Methods Tests', () => {
    it('should use pluck method in unsafe mode', async () => {
      const input = '{"users": [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]}';
      const result = await runJsq('$.users.pluck("name")', { unsafe: true, input });

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(['Alice', 'Bob']);
    });

    it('should use sortBy method in unsafe mode', async () => {
      const input = '[{"value": 3}, {"value": 1}, {"value": 2}]';
      const result = await runJsq('$.sortBy("value").pluck("value")', { unsafe: true, input });

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([1, 2, 3]);
    });

    it('should use sum method in unsafe mode', async () => {
      const input = '{"amounts": [10, 20, 30, 40]}';
      const result = await runJsq('$.amounts.sum()', { unsafe: true, input });

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe(100);
    });

    it('should use first and last methods in unsafe mode', async () => {
      const input = '["a", "b", "c", "d", "e"]';
      const result = await runJsq('[$.at(0), $.at(-1)]', { unsafe: true, input });

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(['a', 'e']);
    });
  });

  describe('Lodash Utilities Tests', () => {
    it('should use _.uniq in unsafe mode', async () => {
      const input = '[1, 2, 2, 3, 3, 3, 4]';
      const result = await runJsq('_.uniq($)', { unsafe: true, input });

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([1, 2, 3, 4]);
    });

    it('should use _.groupBy in unsafe mode', async () => {
      const input = '[{"type": "a", "val": 1}, {"type": "b", "val": 2}, {"type": "a", "val": 3}]';
      const result = await runJsq('_.groupBy($, item => item.type)', { unsafe: true, input });

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.a).toHaveLength(2);
      expect(output.b).toHaveLength(1);
    });

    it('should use _.pick and _.omit in unsafe mode', async () => {
      const input = '{"a": 1, "b": 2, "c": 3, "d": 4}';
      const result = await runJsq('[_.pick($, ["a", "c"]), _.omit($, ["a", "c"])]', {
        unsafe: true,
        input,
      });

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([
        { a: 1, c: 3 },
        { b: 2, d: 4 },
      ]);
    });

    it('should use _.chunk in unsafe mode', async () => {
      const input = '[1, 2, 3, 4, 5, 6, 7, 8]';
      const result = await runJsq('_.chunk($, 3)', { unsafe: true, input });

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8],
      ]);
    });

    it('should use string manipulation utilities in unsafe mode', async () => {
      const input = '"hello_world_test"';
      const result = await runJsq(
        '{camel: _.camelCase(data), kebab: _.kebabCase(data), start: _.startCase(data)}',
        { unsafe: true, input }
      );

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({
        camel: 'helloWorldTest',
        kebab: 'hello-world-test',
        start: 'Hello World Test',
      });
    });

    it('should use _.range without input in unsafe mode', async () => {
      const result = await runJsq('_.range(5)', { unsafe: true });

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([0, 1, 2, 3, 4]);
    });
  });

  describe('Complex Expression Tests', () => {
    it('should handle complex nested operations in unsafe mode', async () => {
      const input = `{
        "orders": [
          {"id": 1, "items": [{"price": 10}, {"price": 20}]},
          {"id": 2, "items": [{"price": 15}, {"price": 25}]},
          {"id": 3, "items": [{"price": 5}]}
        ]
      }`;
      const result = await runJsq(
        '$.orders.map(o => ({id: o.id, total: _.sum(o.items.map(i => i.price))})).sortBy("total")',
        { unsafe: true, input }
      );

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output[0].total).toBe(5);
      expect(output[2].total).toBe(40);
    });

    it('should use async/await in unsafe mode', async () => {
      const input = '[1, 2, 3]';
      const result = await runJsq(
        'await Promise.all($.map(async n => { await new Promise(r => setTimeout(r, 10)); return n * 2; }))',
        { unsafe: true, input }
      );

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([2, 4, 6]);
    });

    it('should handle multiple variable declarations in unsafe mode', async () => {
      const input = '{"users": [{"name": "Alice", "score": 85}, {"name": "Bob", "score": 92}]}';
      const result = await runJsq(
        'const scores = $.users.pluck("score"); const avg = _.mean(scores); {average: avg, aboveAvg: $.users.filter(u => u.score > avg).pluck("name")}',
        { unsafe: true, input }
      );

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.average).toBe(88.5);
      expect(output.aboveAvg).toEqual(['Bob']);
    });
  });

  describe('Regular Expression Tests', () => {
    it('should execute regex operations in unsafe mode', async () => {
      const input = '{"text": "Hello World 123 Test 456"}';
      const result = await runJsq('data.text.match(/\\d+/g)', { unsafe: true, input });

      if (result.exitCode !== 0) {
        console.error('Regex test failed:', result.stderr);
      }

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(['123', '456']);
    });

    it('should handle complex regex replacements', async () => {
      const input = '{"emails": ["test@example.com", "user@domain.org", "admin@site.net"]}';
      const result = await runJsq(
        '$.emails.map(email => email.replace(/^([^@]+)@(.+)$/, "User: $1, Domain: $2"))',
        { unsafe: true, input }
      );

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([
        'User: test, Domain: example.com',
        'User: user, Domain: domain.org',
        'User: admin, Domain: site.net',
      ]);
    });

    it('should use regex with test method', async () => {
      const input =
        '{"urls": ["https://example.com", "http://test.org", "ftp://files.net", "https://secure.io"]}';
      const result = await runJsq('$.urls.filter(url => /^https:/.test(url))', {
        unsafe: true,
        input,
      });

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(['https://example.com', 'https://secure.io']);
    });
  });

  describe('Fetch API Tests', () => {
    it('should fetch data from API in unsafe mode', async () => {
      // Using a stable test API endpoint
      const result = await runJsq(
        `(async () => {
          const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
          const data = await response.json();
          return { id: data.id, title: data.title.substring(0, 20) + '...' };
        })()`,
        { unsafe: true }
      );

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output).toHaveProperty('id', 1);
      expect(output).toHaveProperty('title');
      expect(output.title).toMatch(/^.{20}\.\.\.$/);
    });

    it('should handle fetch errors gracefully', async () => {
      const result = await runJsq(
        `(async () => {
          try {
            const response = await fetch('https://invalid-domain-that-does-not-exist-12345.com');
            return { status: 'success', data: await response.json() };
          } catch (error) {
            return { status: 'error', message: error.message };
          }
        })()`,
        { unsafe: true }
      );

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output).toHaveProperty('status', 'error');
      expect(output).toHaveProperty('message');
    });

    it('should fetch multiple URLs concurrently', async () => {
      const result = await runJsq(
        `(async () => {
          const urls = [
            'https://jsonplaceholder.typicode.com/posts/1',
            'https://jsonplaceholder.typicode.com/posts/2'
          ];
          const responses = await Promise.all(urls.map(url => fetch(url)));
          const data = await Promise.all(responses.map(r => r.json()));
          return data.map(post => ({ id: post.id, userId: post.userId }));
        })()`,
        { unsafe: true }
      );

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output).toHaveLength(2);
      expect(output[0]).toHaveProperty('id', 1);
      expect(output[1]).toHaveProperty('id', 2);
    });
  });

  describe('Shell Command Tests', () => {
    it('should execute basic shell commands in unsafe mode', async () => {
      const result = await runJsq(
        `(async () => {
          const { execSync } = await import('child_process');
          return execSync('echo "Hello from shell"').toString().trim();
        })()`,
        { unsafe: true }
      );

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toBe('Hello from shell');
    });

    it('should list files using shell commands', async () => {
      // Create test files
      await fs.writeFile(join(testDir, 'test1.txt'), 'content1');
      await fs.writeFile(join(testDir, 'test2.txt'), 'content2');

      const result = await runJsq(
        `(async () => {
          const { execSync } = await import('child_process');
          const files = execSync('ls ${testDir}/*.txt 2>/dev/null || true')
            .toString()
            .trim()
            .split('\\n')
            .filter(line => line.length > 0)
            .map(path => path.split('/').pop());
          return files.sort();
        })()`,
        { unsafe: true }
      );

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output).toContain('test1.txt');
      expect(output).toContain('test2.txt');
    });

    it('should process data with shell pipes', async () => {
      const input = '{"numbers": [5, 2, 8, 1, 9, 3]}';
      const result = await runJsq(
        `(async () => {
          const { execSync } = await import('child_process');
          const numbers = data.numbers.join('\\n');
          const sorted = execSync(\`echo "\${numbers}" | sort -n\`)
            .toString()
            .trim()
            .split('\\n')
            .map(Number);
          return sorted;
        })()`,
        { unsafe: true, input }
      );

      if (result.exitCode !== 0) {
        console.error('Shell pipe test failed:', result.stderr);
      }

      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual([1, 2, 3, 5, 8, 9]);
    });

    it('should handle shell command errors', async () => {
      const result = await runJsq(
        `(async () => {
          const { execSync } = await import('child_process');
          try {
            execSync('false'); // Command that always fails
            return { status: 'success' };
          } catch (error) {
            return { status: 'error', code: error.status };
          }
        })()`,
        { unsafe: true }
      );

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output).toHaveProperty('status', 'error');
      expect(output).toHaveProperty('code', 1);
    });
  });

  describe('Combined Operations', () => {
    it('should combine regex, fetch, and shell in one expression', async () => {
      const result = await runJsq(
        `(async () => {
          // Get system info
          const { execSync } = await import('child_process');
          const hostname = execSync('hostname 2>/dev/null || echo "unknown"').toString().trim();
          
          // Process with regex
          const sanitized = hostname.replace(/[^a-zA-Z0-9-]/g, '');
          
          // Fetch data (using a simple endpoint)
          try {
            const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
            const data = await response.json();
            
            return {
              system: sanitized,
              apiData: { id: data.id, title: data.title.substring(0, 30) + '...' },
              timestamp: new Date().toISOString().replace(/T.*/, '')
            };
          } catch (error) {
            return {
              system: sanitized,
              apiData: null,
              error: 'Failed to fetch'
            };
          }
        })()`,
        { unsafe: true }
      );

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output).toHaveProperty('system');
      expect(output).toHaveProperty('timestamp');
      // API data might fail in CI, so we just check the structure
      expect(output).toHaveProperty('apiData');
    });
  });

  describe('Security Validation', () => {
    it('should fail in safe mode when using shell commands', async () => {
      const result = await runJsq(
        `(async () => {
          const { execSync } = await import('child_process');
          return execSync('echo "test"').toString();
        })()`,
        { unsafe: false } // Explicitly safe mode
      );

      // Should fail due to security restrictions
      expect(result.exitCode).not.toBe(0);
    });

    it('should show appropriate error for restricted operations in safe mode', async () => {
      const result = await runJsq('eval("1 + 1")', { unsafe: false });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toMatch(/Security validation failed|Expression evaluation failed/);
    });
  });

  // Cleanup
  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });
});
