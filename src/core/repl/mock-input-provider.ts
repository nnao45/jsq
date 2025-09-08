import { EventEmitter } from 'node:events';
import type { Key } from 'node:readline';
import type { InputProvider } from '@/types/repl';

export interface MockKeyEvent {
  str?: string;
  key?: Key;
}

export class MockInputProvider extends EventEmitter implements InputProvider {
  private keySequence: MockKeyEvent[] = [];
  private currentIndex = 0;

  isTTY = true;

  constructor(keySequence?: MockKeyEvent[]) {
    super();
    if (keySequence) {
      this.keySequence = keySequence;
    }
  }

  setRawMode(_enabled: boolean): void {
    // Mock implementation - no-op
  }

  override on(
    event: 'keypress',
    listener: (str: string | undefined, key: Key | undefined) => void
  ): this {
    super.on(event, listener);
    return this;
  }

  override off(
    event: 'keypress',
    listener: (str: string | undefined, key: Key | undefined) => void
  ): this {
    super.off(event, listener);
    return this;
  }

  addKeySequence(events: MockKeyEvent[]): void {
    this.keySequence.push(...events);
  }

  clearKeySequence(): void {
    this.keySequence = [];
    this.currentIndex = 0;
  }

  async playAll(delay = 0, events?: MockKeyEvent[]): Promise<void> {
    if (events) {
      this.keySequence = events;
    }

    this.currentIndex = 0;

    while (this.currentIndex < this.keySequence.length) {
      await this.playNext();
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async playNext(event?: MockKeyEvent): Promise<boolean> {
    if (event) {
      this.emit('keypress', event.str, event.key);
      return true;
    }

    if (this.currentIndex >= this.keySequence.length) {
      return false;
    }

    const keyEvent = this.keySequence[this.currentIndex++];
    this.emit('keypress', keyEvent.str, keyEvent.key);
    return true;
  }

  async playKey(key: string): Promise<boolean> {
    return this.playNext({ str: key });
  }

  reset(): void {
    this.currentIndex = 0;
  }

  static createKeySequenceFromString(input: string): MockKeyEvent[] {
    const events: MockKeyEvent[] = [];

    for (const char of input) {
      events.push({ str: char });
    }

    events.push({ key: { name: 'return' } as Key });

    return events;
  }

  static createControlKey(name: string): MockKeyEvent {
    return {
      key: {
        name,
        ctrl: true,
      } as Key,
    };
  }

  static createSpecialKey(name: string): MockKeyEvent {
    return {
      key: {
        name,
      } as Key,
    };
  }
}
