import { describeWithVM, isIsolatedVMAvailable, testWithVM } from '@/test/vm-helpers';
import { VMSandboxSimple } from '../vm/vm-sandbox-simple';

describeWithVM('Property Access Tests', () => {
  beforeAll(() => {
    if (!isIsolatedVMAvailable()) {
      console.log('⚠️  isolated-vm not available - property access tests will be skipped');
    }
  });

  describe('Basic Property Access', () => {
    let sandbox: VMSandboxSimple;

    beforeEach(() => {
      sandbox = new VMSandboxSimple();
    });

    afterEach(async () => {
      await sandbox.dispose();
    });

    testWithVM('should access simple object properties with dot notation', async () => {
      const context = { data: { name: 'test', value: 42 } };
      const result = await sandbox.execute('data.name', context);
      expect(result.value).toBe('test');
    });

    testWithVM('should access simple object properties with bracket notation', async () => {
      const context = { data: { name: 'test', value: 42 } };
      const result = await sandbox.execute('data["name"]', context);
      expect(result.value).toBe('test');
    });

    testWithVM('should access numeric properties', async () => {
      const context = { data: { value: 42 } };
      const result = await sandbox.execute('data.value', context);
      expect(result.value).toBe(42);
    });

    testWithVM('should access boolean properties', async () => {
      const context = { data: { isActive: true } };
      const result = await sandbox.execute('data.isActive', context);
      expect(result.value).toBe(true);
    });

    testWithVM('should access array elements with bracket notation', async () => {
      const context = { data: [10, 20, 30] };
      const result = await sandbox.execute('data[1]', context);
      expect(result.value).toBe(20);
    });

    testWithVM('should access array length property', async () => {
      const context = { data: [1, 2, 3, 4, 5] };
      const result = await sandbox.execute('data.length', context);
      expect(result.value).toBe(5);
    });

    testWithVM('should access nested object properties', async () => {
      const context = { data: { user: { profile: { name: 'John' } } } };
      const result = await sandbox.execute('data.user.profile.name', context);
      expect(result.value).toBe('John');
    });

    testWithVM('should access properties with special characters in bracket notation', async () => {
      const context = { data: { 'special-key': 'special-value', 'with space': 'spaced' } };
      const result = await sandbox.execute('data["special-key"]', context);
      expect(result.value).toBe('special-value');
    });

    testWithVM('should access properties with spaces using bracket notation', async () => {
      const context = { data: { 'with space': 'spaced value' } };
      const result = await sandbox.execute('data["with space"]', context);
      expect(result.value).toBe('spaced value');
    });

    testWithVM('should handle undefined properties gracefully', async () => {
      const context = { data: { name: 'test' } };
      const result = await sandbox.execute('data.nonexistent', context);
      expect(result.value).toBeUndefined();
    });

    testWithVM('should access array of objects', async () => {
      const context = {
        data: [
          { id: 1, name: 'first' },
          { id: 2, name: 'second' },
        ],
      };
      const result = await sandbox.execute('data[0].name', context);
      expect(result.value).toBe('first');
    });

    testWithVM('should access object with array property', async () => {
      const context = { data: { items: ['a', 'b', 'c'] } };
      const result = await sandbox.execute('data.items[1]', context);
      expect(result.value).toBe('b');
    });

    testWithVM('should handle null property access', async () => {
      const context = { data: { nullValue: null } };
      const result = await sandbox.execute('data.nullValue', context);
      expect(result.value).toBeNull();
    });

    testWithVM('should access string length property', async () => {
      const context = { data: 'hello world' };
      const result = await sandbox.execute('data.length', context);
      expect(result.value).toBe(11);
    });

    testWithVM('should access string character by index', async () => {
      const context = { data: 'hello' };
      const result = await sandbox.execute('data[1]', context);
      expect(result.value).toBe('e');
    });

    testWithVM('should handle complex nested access', async () => {
      const context = {
        data: {
          users: [
            { profile: { settings: { theme: 'dark' } } },
            { profile: { settings: { theme: 'light' } } },
          ],
        },
      };
      const result = await sandbox.execute('data.users[1].profile.settings.theme', context);
      expect(result.value).toBe('light');
    });

    testWithVM('should access computed property names', async () => {
      const context = { data: { key1: 'value1', key2: 'value2' }, prop: 'key2' };
      const result = await sandbox.execute('data[prop]', context);
      expect(result.value).toBe('value2');
    });

    testWithVM('should access properties of Date objects', async () => {
      const context = { data: new Date('2024-01-01') };
      const result = await sandbox.execute('data.getFullYear()', context);
      expect(result.value).toBe(2024);
    });

    testWithVM('should handle mixed property access patterns', async () => {
      const context = {
        data: {
          'mixed-key': {
            normalKey: ['item1', 'item2'],
            'another-key': { value: 123 },
          },
        },
      };
      const result = await sandbox.execute('data["mixed-key"].normalKey[0]', context);
      expect(result.value).toBe('item1');
    });

    testWithVM('should handle object destructuring-like access', async () => {
      const context = { data: { a: 1, b: 2, c: { d: 4 } } };
      const result = await sandbox.execute('data.c.d + data.a', context);
      expect(result.value).toBe(5);
    });
  });
});
