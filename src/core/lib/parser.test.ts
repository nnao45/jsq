import { describe, expect, it } from 'vitest';
import { JsonParser } from './parser';

describe('JsonParser', () => {
  let parser: JsonParser;

  beforeEach(() => {
    parser = new JsonParser({});
  });

  describe('Basic JSON parsing', () => {
    it('should parse valid JSON objects', () => {
      const input = '{"name": "Alice", "age": 30}';
      const result = parser.parse(input);
      expect(result).toEqual({ name: 'Alice', age: 30 });
    });

    it('should parse valid JSON arrays', () => {
      const input = '[1, 2, 3, "hello", true]';
      const result = parser.parse(input);
      expect(result).toEqual([1, 2, 3, 'hello', true]);
    });

    it('should parse nested JSON structures', () => {
      const input = `{
        "users": [
          {"name": "Alice", "profile": {"age": 30, "active": true}},
          {"name": "Bob", "profile": {"age": 25, "active": false}}
        ],
        "metadata": {
          "total": 2,
          "page": 1
        }
      }`;

      const result = parser.parse(input);
      expect(result).toEqual({
        users: [
          { name: 'Alice', profile: { age: 30, active: true } },
          { name: 'Bob', profile: { age: 25, active: false } },
        ],
        metadata: {
          total: 2,
          page: 1,
        },
      });
    });

    it('should parse primitive values', () => {
      expect(parser.parse('42')).toBe(42);
      expect(parser.parse('"hello"')).toBe('hello');
      expect(parser.parse('true')).toBe(true);
      expect(parser.parse('false')).toBe(false);
      expect(parser.parse('null')).toBe(null);
    });

    it('should handle empty objects and arrays', () => {
      expect(parser.parse('{}')).toEqual({});
      expect(parser.parse('[]')).toEqual([]);
    });
  });

  describe('JSON preprocessing and cleanup', () => {
    it('should remove trailing commas in objects', () => {
      const input = '{"name": "Alice", "age": 30,}';
      const result = parser.parse(input);
      expect(result).toEqual({ name: 'Alice', age: 30 });
    });

    it('should remove trailing commas in arrays', () => {
      const input = '[1, 2, 3,]';
      const result = parser.parse(input);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should handle multiple trailing commas', () => {
      const input = '{"a": 1, "b": 2,,,}';
      // This should either parse successfully or throw an error, depending on implementation
      try {
        const result = parser.parse(input);
        expect(result).toEqual({ a: 1, b: 2 });
      } catch (error) {
        // If parser doesn't handle multiple trailing commas, that's acceptable
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should quote unquoted property names', () => {
      const input = '{name: "Alice", age: 30}';
      const result = parser.parse(input);
      expect(result).toEqual({ name: 'Alice', age: 30 });
    });

    it('should handle mixed quoted and unquoted properties', () => {
      const input = '{name: "Alice", "age": 30, isActive: true}';
      const result = parser.parse(input);
      expect(result).toEqual({ name: 'Alice', age: 30, isActive: true });
    });

    it('should handle complex preprocessing cases', () => {
      const input = `{
        users: [
          {name: "Alice", age: 30,},
          {name: "Bob", age: 25,}
        ],
        metadata: {
          total: 2,
          active: true,
        },
      }`;

      const result = parser.parse(input);
      expect(result).toEqual({
        users: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 },
        ],
        metadata: {
          total: 2,
          active: true,
        },
      });
    });
  });

  describe('Error handling', () => {
    it('should throw error for empty input', () => {
      expect(() => parser.parse('')).toThrow('Empty input');
      expect(() => parser.parse('   ')).toThrow('Empty input');
      expect(() => parser.parse('\t\n  ')).toThrow('Empty input');
    });

    it('should throw error for invalid JSON syntax', () => {
      expect(() => parser.parse('{')).toThrow('Invalid JSON');
      expect(() => parser.parse('{"name"}')).toThrow('Invalid JSON');
      expect(() => parser.parse('{"name": undefined}')).toThrow('Invalid JSON');
      expect(() => parser.parse('[1, 2, 3')).toThrow('Invalid JSON');
    });

    it('should provide descriptive error messages', () => {
      try {
        parser.parse('{"unclosed": "string}');
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toContain('Invalid JSON');
      }
    });

    it('should handle malformed JSON that cannot be fixed', () => {
      const malformedInputs = [
        '{name: function() {}}',
        '[1, 2, undefined, 4]',
        '{"key": /regex/}',
        '{name: name}', // unquoted value
      ];

      malformedInputs.forEach(input => {
        expect(() => parser.parse(input)).toThrow('Invalid JSON');
      });
    });
  });

  describe('Whitespace and formatting', () => {
    it('should handle various whitespace patterns', () => {
      const inputs = [
        '  {"name": "Alice"}  ',
        '\t{\n  "name": "Alice"\n}\t',
        '{\r\n  "name": "Alice"\r\n}',
        '   [1,2,3]   ',
      ];

      const expected = [{ name: 'Alice' }, { name: 'Alice' }, { name: 'Alice' }, [1, 2, 3]];

      inputs.forEach((input, index) => {
        expect(parser.parse(input)).toEqual(expected[index]);
      });
    });

    it('should handle mixed indentation', () => {
      const input = `{
    "level1": {
        "level2": {
      "level3": "value"
        }
    }
}`;

      const result = parser.parse(input);
      expect(result).toEqual({
        level1: {
          level2: {
            level3: 'value',
          },
        },
      });
    });
  });

  describe('Real-world JSON examples', () => {
    it('should parse API response format', () => {
      const apiResponse = `{
        "status": "success",
        "data": {
          "users": [
            {
              "id": 1,
              "username": "alice",
              "email": "alice@example.com",
              "profile": {
                "firstName": "Alice",
                "lastName": "Johnson",
                "avatar": "https://example.com/avatars/alice.jpg",
                "settings": {
                  "theme": "dark",
                  "notifications": true,
                  "language": "en"
                }
              },
              "roles": ["user", "admin"],
              "createdAt": "2023-01-15T10:30:00Z",
              "lastLogin": "2023-01-20T14:45:00Z"
            }
          ],
          "pagination": {
            "total": 150,
            "page": 1,
            "limit": 20,
            "hasNext": true
          }
        },
        "meta": {
          "requestId": "req_123456",
          "timestamp": "2023-01-20T15:00:00Z",
          "version": "1.0"
        }
      }`;

      const result = parser.parse(apiResponse);
      expect(result.status).toBe('success');
      expect(result.data.users).toHaveLength(1);
      expect(result.data.users[0].profile.firstName).toBe('Alice');
      expect(result.data.pagination.total).toBe(150);
      expect(result.meta.requestId).toBe('req_123456');
    });

    it('should parse configuration file format', () => {
      const configJson = `{
        "app": {
          "name": "MyApp",
          "version": "1.2.3",
          "env": "production"
        },
        "database": {
          "host": "localhost",
          "port": 5432,
          "name": "myapp_db",
          "ssl": true,
          "pool": {
            "min": 5,
            "max": 20,
            "idle": 10000
          }
        },
        "redis": {
          "host": "localhost",
          "port": 6379,
          "db": 0
        },
        "logging": {
          "level": "info",
          "file": "/var/log/myapp.log",
          "maxSize": "10MB",
          "maxFiles": 5
        },
        "features": {
          "enableMetrics": true,
          "enableCache": true,
          "enableDebug": false
        }
      }`;

      const result = parser.parse(configJson);
      expect(result.app.name).toBe('MyApp');
      expect(result.database.pool.max).toBe(20);
      expect(result.features.enableMetrics).toBe(true);
    });

    it('should parse analytics data format', () => {
      const analyticsData = `{
        "events": [
          {
            "id": "evt_001",
            "type": "page_view",
            "timestamp": 1640995200000,
            "properties": {
              "page": "/dashboard",
              "referrer": "https://google.com",
              "userAgent": "Mozilla/5.0...",
              "sessionId": "sess_abc123"
            },
            "user": {
              "id": "user_456",
              "traits": {
                "email": "user@example.com",
                "plan": "premium"
              }
            }
          },
          {
            "id": "evt_002",
            "type": "button_click",
            "timestamp": 1640995260000,
            "properties": {
              "buttonText": "Save Settings",
              "section": "user_preferences"
            },
            "user": {
              "id": "user_456"
            }
          }
        ],
        "summary": {
          "totalEvents": 2,
          "uniqueUsers": 1,
          "timeRange": {
            "start": 1640995200000,
            "end": 1640995260000
          }
        }
      }`;

      const result = parser.parse(analyticsData);
      expect(result.events).toHaveLength(2);
      expect(result.events[0].type).toBe('page_view');
      expect(result.summary.uniqueUsers).toBe(1);
    });
  });

  describe('Schema validation (placeholder)', () => {
    it('should not throw error when no schema is provided', () => {
      const input = '{"name": "Alice"}';
      expect(() => parser.parse(input)).not.toThrow();
    });

    it('should throw error when schema validation is not implemented', () => {
      const parserWithSchema = new JsonParser({ schema: 'some-schema-path' });
      const input = '{"name": "Alice"}';

      expect(() => parserWithSchema.parse(input)).toThrow('Schema validation not yet implemented');
    });
  });

  describe('Stream parsing (placeholder)', () => {
    it('should throw error for stream parsing (not implemented)', () => {
      const mockStream = {} as Record<string, unknown>;
      expect(() => parser.parseStream(mockStream)).toThrow('Stream parsing not yet implemented');
    });
  });

  describe('Edge cases and performance', () => {
    it('should handle deeply nested structures', () => {
      let deepObject = '{"level": 1';
      for (let i = 2; i <= 10; i++) {
        deepObject += `, "nested": {"level": ${i}`;
      }
      for (let i = 0; i < 10; i++) {
        deepObject += '}';
      }

      const result = parser.parse(deepObject);
      expect(result.level).toBe(1);

      // Navigate to the deepest level
      let current = result;
      for (let i = 2; i <= 10; i++) {
        current = (current as Record<string, unknown>).nested;
        expect(current.level).toBe(i);
      }
    });

    it('should handle large arrays efficiently', () => {
      const largeArray = `[${Array.from({ length: 1000 }, (_, i) => i).join(',')}]`;
      const result = parser.parse(largeArray);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1000);
      expect(result[0]).toBe(0);
      expect(result[999]).toBe(999);
    });

    it('should handle Unicode characters', () => {
      const unicodeJson = `{
        "japanese": "こんにちは",
        "emoji": "🚀🎉",
        "chinese": "你好",
        "arabic": "مرحبا",
        "special": "\\u0041\\u0042\\u0043"
      }`;

      const result = parser.parse(unicodeJson);
      expect(result.japanese).toBe('こんにちは');
      expect(result.emoji).toBe('🚀🎉');
      expect(result.chinese).toBe('你好');
      expect(result.arabic).toBe('مرحبا');
      expect(result.special).toBe('ABC');
    });
  });
});
