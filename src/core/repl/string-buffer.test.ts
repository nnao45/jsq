import { StringBuffer } from './string-buffer';

describe('StringBuffer', () => {
  describe('constructor', () => {
    it('should create empty buffer when no initial value provided', () => {
      const buffer = new StringBuffer();
      expect(buffer.toString()).toBe('');
      expect(buffer.length()).toBe(0);
    });

    it('should create buffer with initial string', () => {
      const buffer = new StringBuffer('hello');
      expect(buffer.toString()).toBe('hello');
      expect(buffer.length()).toBe(5);
    });

    it('should handle emoji and unicode characters', () => {
      const buffer = new StringBuffer('こんにちは🎌');
      expect(buffer.toString()).toBe('こんにちは🎌');
      expect(buffer.length()).toBe(7); // 5文字 + 2文字分の絵文字
    });
  });

  describe('insert', () => {
    it('should insert at beginning', () => {
      const buffer = new StringBuffer('world');
      buffer.insert(0, 'hello ');
      expect(buffer.toString()).toBe('hello world');
    });

    it('should insert in middle', () => {
      const buffer = new StringBuffer('helo');
      buffer.insert(2, 'l');
      expect(buffer.toString()).toBe('hello');
    });

    it('should insert at end', () => {
      const buffer = new StringBuffer('hello');
      buffer.insert(5, ' world');
      expect(buffer.toString()).toBe('hello world');
    });

    it('should insert empty string', () => {
      const buffer = new StringBuffer('hello');
      buffer.insert(2, '');
      expect(buffer.toString()).toBe('hello');
    });

    it('should insert multi-byte characters', () => {
      const buffer = new StringBuffer('hello');
      buffer.insert(5, '🎌こんにちは');
      expect(buffer.toString()).toBe('hello🎌こんにちは');
    });
  });

  describe('delete', () => {
    it('should delete single character', () => {
      const buffer = new StringBuffer('hello');
      buffer.delete(1);
      expect(buffer.toString()).toBe('hllo');
    });

    it('should delete multiple characters', () => {
      const buffer = new StringBuffer('hello world');
      buffer.delete(5, 6);
      expect(buffer.toString()).toBe('hello');
    });

    it('should delete from beginning', () => {
      const buffer = new StringBuffer('hello');
      buffer.delete(0, 2);
      expect(buffer.toString()).toBe('llo');
    });

    it('should delete to end', () => {
      const buffer = new StringBuffer('hello world');
      buffer.delete(6, 5);
      expect(buffer.toString()).toBe('hello ');
    });

    it('should handle delete beyond buffer length', () => {
      const buffer = new StringBuffer('hello');
      buffer.delete(2, 10);
      expect(buffer.toString()).toBe('he');
    });

    it('should handle emoji deletion', () => {
      const buffer = new StringBuffer('hello🎌world');
      buffer.delete(5, 2); // 絵文字は2文字分
      expect(buffer.toString()).toBe('helloworld');
    });
  });

  describe('clear', () => {
    it('should clear buffer', () => {
      const buffer = new StringBuffer('hello world');
      buffer.clear();
      expect(buffer.toString()).toBe('');
      expect(buffer.length()).toBe(0);
    });

    it('should allow operations after clear', () => {
      const buffer = new StringBuffer('hello');
      buffer.clear();
      buffer.insert(0, 'world');
      expect(buffer.toString()).toBe('world');
    });
  });

  describe('set', () => {
    it('should replace entire content', () => {
      const buffer = new StringBuffer('hello');
      buffer.set('world');
      expect(buffer.toString()).toBe('world');
      expect(buffer.length()).toBe(5);
    });

    it('should set empty string', () => {
      const buffer = new StringBuffer('hello');
      buffer.set('');
      expect(buffer.toString()).toBe('');
      expect(buffer.length()).toBe(0);
    });

    it('should handle unicode in set', () => {
      const buffer = new StringBuffer('hello');
      buffer.set('こんにちは🎌');
      expect(buffer.toString()).toBe('こんにちは🎌');
    });
  });

  describe('substring', () => {
    it('should get substring from start', () => {
      const buffer = new StringBuffer('hello world');
      expect(buffer.substring(0, 5)).toBe('hello');
    });

    it('should get substring from middle', () => {
      const buffer = new StringBuffer('hello world');
      expect(buffer.substring(6, 11)).toBe('world');
    });

    it('should get substring to end when end not specified', () => {
      const buffer = new StringBuffer('hello world');
      expect(buffer.substring(6)).toBe('world');
    });

    it('should handle out of bounds indices', () => {
      const buffer = new StringBuffer('hello');
      expect(buffer.substring(3, 10)).toBe('lo');
      expect(buffer.substring(10, 20)).toBe('');
    });

    it('should handle negative indices', () => {
      const buffer = new StringBuffer('hello world');
      expect(buffer.substring(-5)).toBe('world'); // slice handles negative indices from end
    });

    it('should handle unicode substring', () => {
      const buffer = new StringBuffer('hello🎌world');
      expect(buffer.substring(5, 7)).toBe('🎌');
    });
  });

  describe('edge cases', () => {
    it('should handle operations on empty buffer', () => {
      const buffer = new StringBuffer();
      buffer.insert(0, 'hello');
      expect(buffer.toString()).toBe('hello');

      const buffer2 = new StringBuffer();
      buffer2.delete(0);
      expect(buffer2.toString()).toBe('');

      const buffer3 = new StringBuffer();
      expect(buffer3.substring(0, 5)).toBe('');
    });

    it('should handle large strings', () => {
      const largeString = 'a'.repeat(10000);
      const buffer = new StringBuffer(largeString);
      expect(buffer.length()).toBe(10000);

      buffer.insert(5000, 'b'.repeat(1000));
      expect(buffer.length()).toBe(11000);
      expect(buffer.substring(5000, 5010)).toBe('bbbbbbbbbb');
    });

    it('should maintain state across multiple operations', () => {
      const buffer = new StringBuffer();
      buffer.set('hello');
      buffer.insert(5, ' ');
      buffer.insert(6, 'world');
      buffer.delete(0, 6);
      buffer.insert(0, 'Hello ');
      expect(buffer.toString()).toBe('Hello world');
    });
  });
});
