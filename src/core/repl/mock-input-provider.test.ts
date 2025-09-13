import type { Key } from 'node:readline';
import { vi } from 'vitest';
import { MockInputProvider, type MockKeyEvent } from './mock-input-provider';

describe('MockInputProvider', () => {
  describe('constructor', () => {
    it('should create instance without key sequence', () => {
      const provider = new MockInputProvider();
      expect(provider.isTTY).toBe(true);
    });

    it('should create instance with initial key sequence', () => {
      const keySequence: MockKeyEvent[] = [{ str: 'a' }, { str: 'b' }];
      const provider = new MockInputProvider(keySequence);
      expect(provider.isTTY).toBe(true);
    });
  });

  describe('setRawMode', () => {
    it('should not throw when called', () => {
      const provider = new MockInputProvider();
      expect(() => provider.setRawMode(true)).not.toThrow();
      expect(() => provider.setRawMode(false)).not.toThrow();
    });
  });

  describe('event listeners', () => {
    it('should add keypress listener', () => {
      const provider = new MockInputProvider();
      const listener = vi.fn();

      provider.on('keypress', listener);
      provider.emit('keypress', 'a', undefined);

      expect(listener).toHaveBeenCalledWith('a', undefined);
    });

    it('should remove keypress listener', () => {
      const provider = new MockInputProvider();
      const listener = vi.fn();

      provider.on('keypress', listener);
      provider.off('keypress', listener);
      provider.emit('keypress', 'a', undefined);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should support method chaining for on/off', () => {
      const provider = new MockInputProvider();
      const listener = vi.fn();

      const result1 = provider.on('keypress', listener);
      expect(result1).toBe(provider);

      const result2 = provider.off('keypress', listener);
      expect(result2).toBe(provider);
    });
  });

  describe('addKeySequence', () => {
    it('should add events to key sequence', async () => {
      const provider = new MockInputProvider();
      const listener = vi.fn();
      provider.on('keypress', listener);

      provider.addKeySequence([{ str: 'a' }, { str: 'b' }]);

      await provider.playNext();
      expect(listener).toHaveBeenCalledWith('a', undefined);
    });

    it('should append to existing sequence', async () => {
      const provider = new MockInputProvider([{ str: 'a' }]);
      const listener = vi.fn();
      provider.on('keypress', listener);

      provider.addKeySequence([{ str: 'b' }]);

      await provider.playNext();
      await provider.playNext();

      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenNthCalledWith(1, 'a', undefined);
      expect(listener).toHaveBeenNthCalledWith(2, 'b', undefined);
    });
  });

  describe('clearKeySequence', () => {
    it('should clear key sequence and reset index', async () => {
      const provider = new MockInputProvider([{ str: 'a' }, { str: 'b' }]);
      const listener = vi.fn();
      provider.on('keypress', listener);

      await provider.playNext();
      provider.clearKeySequence();

      const hasMore = await provider.playNext();
      expect(hasMore).toBe(false);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('playNext', () => {
    it('should play next event in sequence', async () => {
      const provider = new MockInputProvider([{ str: 'a' }, { str: 'b' }]);
      const listener = vi.fn();
      provider.on('keypress', listener);

      const result1 = await provider.playNext();
      expect(result1).toBe(true);
      expect(listener).toHaveBeenCalledWith('a', undefined);

      const result2 = await provider.playNext();
      expect(result2).toBe(true);
      expect(listener).toHaveBeenCalledWith('b', undefined);

      const result3 = await provider.playNext();
      expect(result3).toBe(false);
    });

    it('should play provided event directly', async () => {
      const provider = new MockInputProvider();
      const listener = vi.fn();
      provider.on('keypress', listener);

      const event = { str: 'x' };
      const result = await provider.playNext(event);

      expect(result).toBe(true);
      expect(listener).toHaveBeenCalledWith('x', undefined);
    });

    it('should handle key events', async () => {
      const key: Key = { name: 'enter' };
      const provider = new MockInputProvider([{ key }]);
      const listener = vi.fn();
      provider.on('keypress', listener);

      await provider.playNext();
      expect(listener).toHaveBeenCalledWith(undefined, key);
    });
  });

  describe('playKey', () => {
    it('should play single key', async () => {
      const provider = new MockInputProvider();
      const listener = vi.fn();
      provider.on('keypress', listener);

      const result = await provider.playKey('a');

      expect(result).toBe(true);
      expect(listener).toHaveBeenCalledWith('a', undefined);
    });
  });

  describe('playAll', () => {
    it('should play all events in sequence', async () => {
      const provider = new MockInputProvider([{ str: 'a' }, { str: 'b' }, { str: 'c' }]);
      const listener = vi.fn();
      provider.on('keypress', listener);

      await provider.playAll();

      expect(listener).toHaveBeenCalledTimes(3);
      expect(listener).toHaveBeenNthCalledWith(1, 'a', undefined);
      expect(listener).toHaveBeenNthCalledWith(2, 'b', undefined);
      expect(listener).toHaveBeenNthCalledWith(3, 'c', undefined);
    });

    it('should play with delay between events', async () => {
      const provider = new MockInputProvider([{ str: 'a' }, { str: 'b' }]);
      const listener = vi.fn();
      provider.on('keypress', listener);

      const startTime = Date.now();
      await provider.playAll(10);
      const endTime = Date.now();

      expect(listener).toHaveBeenCalledTimes(2);
      expect(endTime - startTime).toBeGreaterThanOrEqual(10);
    });

    it('should accept new events parameter', async () => {
      const provider = new MockInputProvider([{ str: 'old' }]);
      const listener = vi.fn();
      provider.on('keypress', listener);

      await provider.playAll(0, [{ str: 'new1' }, { str: 'new2' }]);

      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenNthCalledWith(1, 'new1', undefined);
      expect(listener).toHaveBeenNthCalledWith(2, 'new2', undefined);
    });
  });

  describe('reset', () => {
    it('should reset current index', async () => {
      const provider = new MockInputProvider([{ str: 'a' }, { str: 'b' }]);
      const listener = vi.fn();
      provider.on('keypress', listener);

      await provider.playNext();
      provider.reset();
      await provider.playNext();

      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenNthCalledWith(1, 'a', undefined);
      expect(listener).toHaveBeenNthCalledWith(2, 'a', undefined);
    });
  });

  describe('static methods', () => {
    describe('createKeySequenceFromString', () => {
      it('should create key sequence from string', () => {
        const sequence = MockInputProvider.createKeySequenceFromString('hello');

        expect(sequence).toHaveLength(6);
        expect(sequence[0]).toEqual({ str: 'h' });
        expect(sequence[1]).toEqual({ str: 'e' });
        expect(sequence[2]).toEqual({ str: 'l' });
        expect(sequence[3]).toEqual({ str: 'l' });
        expect(sequence[4]).toEqual({ str: 'o' });
        expect(sequence[5]).toEqual({ key: { name: 'return' } });
      });

      it('should handle empty string', () => {
        const sequence = MockInputProvider.createKeySequenceFromString('');

        expect(sequence).toHaveLength(1);
        expect(sequence[0]).toEqual({ key: { name: 'return' } });
      });

      it('should handle unicode characters', () => {
        const sequence = MockInputProvider.createKeySequenceFromString('こんにちは');

        expect(sequence).toHaveLength(6);
        expect(sequence[0]).toEqual({ str: 'こ' });
        expect(sequence[4]).toEqual({ str: 'は' });
        expect(sequence[5]).toEqual({ key: { name: 'return' } });
      });
    });

    describe('createControlKey', () => {
      it('should create control key event', () => {
        const event = MockInputProvider.createControlKey('c');

        expect(event).toEqual({
          key: {
            name: 'c',
            ctrl: true,
          },
        });
      });
    });

    describe('createSpecialKey', () => {
      it('should create special key event', () => {
        const event = MockInputProvider.createSpecialKey('backspace');

        expect(event).toEqual({
          key: {
            name: 'backspace',
          },
        });
      });
    });
  });

  describe('integration scenarios', () => {
    it('should simulate typing and editing', async () => {
      const provider = new MockInputProvider();
      const listener = vi.fn();
      provider.on('keypress', listener);

      const sequence = [
        ...MockInputProvider.createKeySequenceFromString('hello'),
        MockInputProvider.createSpecialKey('backspace'),
        MockInputProvider.createSpecialKey('backspace'),
        { str: 'p' },
        MockInputProvider.createControlKey('a'),
        MockInputProvider.createControlKey('k'),
      ];

      await provider.playAll(0, sequence);

      expect(listener).toHaveBeenCalledTimes(11);
    });

    it('should handle multiple listeners', async () => {
      const provider = new MockInputProvider([{ str: 'a' }]);
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      provider.on('keypress', listener1);
      provider.on('keypress', listener2);
      await provider.playNext();

      expect(listener1).toHaveBeenCalledWith('a', undefined);
      expect(listener2).toHaveBeenCalledWith('a', undefined);
    });
  });
});
