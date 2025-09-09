import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomAutocompletePrompt } from './custom-autocomplete-prompt.js';

// Enquirerのモック
vi.mock('enquirer', () => {
  class MockAutoComplete {
    input = '';
    cursor = 0;
    value = '';
    choices: any[] = [];

    constructor(public options: any) {}

    async keypress(_input: string, _key: any): Promise<void> {
      // デフォルトの実装
    }

    async render(): Promise<void> {
      // デフォルトの実装
    }

    async submit(): Promise<void> {
      this.value = this.input;
    }

    format(value: string): string {
      return value;
    }
  }

  return {
    AutoComplete: MockAutoComplete,
  };
});

// fs/promisesのモック
vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}));

describe('CustomAutocompletePrompt', () => {
  let prompt: CustomAutocompletePrompt;
  const mockHistoryFile = '.test_history';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      prompt = new CustomAutocompletePrompt({
        message: 'test>',
      });

      expect(prompt).toBeDefined();
      expect((prompt as any).maxHistory).toBe(1000);
      expect((prompt as any).history).toEqual([]);
      expect((prompt as any).historyIndex).toBe(-1);
    });

    it('should initialize with custom options', () => {
      prompt = new CustomAutocompletePrompt({
        message: 'test>',
        historyFile: mockHistoryFile,
        maxHistory: 500,
      });

      expect((prompt as any).maxHistory).toBe(500);
      expect((prompt as any).historyFile).toBe(mockHistoryFile);
    });

    it('should load history from file if specified', async () => {
      const mockHistory = 'command1\ncommand2\ncommand3';
      vi.mocked(fs.readFile).mockResolvedValue(mockHistory);

      prompt = new CustomAutocompletePrompt({
        message: 'test>',
        historyFile: mockHistoryFile,
      });

      // loadHistoryが非同期なので少し待つ
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(fs.readFile).toHaveBeenCalledWith(
        path.resolve(os.homedir(), mockHistoryFile),
        'utf-8'
      );
    });
  });

  describe('addToHistory', () => {
    beforeEach(() => {
      prompt = new CustomAutocompletePrompt({
        message: 'test>',
        historyFile: mockHistoryFile,
      });
    });

    it('should add non-empty input to history', () => {
      prompt.addToHistory('test command');

      expect((prompt as any).history).toContain('test command');
    });

    it('should not add empty or whitespace input', () => {
      prompt.addToHistory('');
      prompt.addToHistory('   ');

      expect((prompt as any).history).toHaveLength(0);
    });

    it('should not add duplicate commands', () => {
      prompt.addToHistory('test command');
      prompt.addToHistory('test command');

      expect((prompt as any).history).toHaveLength(1);
    });

    it('should maintain max history limit', () => {
      prompt = new CustomAutocompletePrompt({
        message: 'test>',
        maxHistory: 3,
      });

      prompt.addToHistory('command1');
      prompt.addToHistory('command2');
      prompt.addToHistory('command3');
      prompt.addToHistory('command4');

      const history = (prompt as any).history;
      expect(history).toHaveLength(3);
      expect(history).toEqual(['command2', 'command3', 'command4']);
    });

    it('should save history to file', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      prompt.addToHistory('test command');

      // saveHistoryが非同期なので少し待つ
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(fs.writeFile).toHaveBeenCalledWith(
        path.resolve(os.homedir(), mockHistoryFile),
        'test command\n'
      );
    });
  });

  describe('keypress handling', () => {
    beforeEach(() => {
      prompt = new CustomAutocompletePrompt({
        message: 'test>',
      });

      // 履歴を準備
      (prompt as any).history = ['command1', 'command2', 'command3'];
      (prompt as any).input = 'current input';
    });

    it('should navigate history with up key', async () => {
      const renderSpy = vi.spyOn(prompt, 'render' as any).mockResolvedValue(undefined);

      await prompt.keypress('', { name: 'up' });

      expect((prompt as any).isNavigatingHistory).toBe(true);
      expect((prompt as any).historyIndex).toBe(2);
      expect((prompt as any).input).toBe('command3');
      expect((prompt as any).cursor).toBe(8); // length of 'command3'
      expect(renderSpy).toHaveBeenCalled();
    });

    it('should navigate history with multiple up keys', async () => {
      const _renderSpy = vi.spyOn(prompt, 'render' as any).mockResolvedValue(undefined);

      await prompt.keypress('', { name: 'up' });
      await prompt.keypress('', { name: 'up' });
      await prompt.keypress('', { name: 'up' });

      expect((prompt as any).historyIndex).toBe(0);
      expect((prompt as any).input).toBe('command1');
    });

    it('should not go beyond history bounds', async () => {
      const _renderSpy = vi.spyOn(prompt, 'render' as any).mockResolvedValue(undefined);

      // すでに最初まで行く
      await prompt.keypress('', { name: 'up' });
      await prompt.keypress('', { name: 'up' });
      await prompt.keypress('', { name: 'up' });

      // さらに上を押しても最初のまま
      await prompt.keypress('', { name: 'up' });

      expect((prompt as any).historyIndex).toBe(0);
      expect((prompt as any).input).toBe('command1');
    });

    it('should navigate forward with down key', async () => {
      const _renderSpy = vi.spyOn(prompt, 'render' as any).mockResolvedValue(undefined);

      // まず履歴を遡る
      await prompt.keypress('', { name: 'up' });
      await prompt.keypress('', { name: 'up' });

      // 下キーで進む
      await prompt.keypress('', { name: 'down' });

      expect((prompt as any).historyIndex).toBe(2);
      expect((prompt as any).input).toBe('command3');
    });

    it('should return to original input when navigating past newest', async () => {
      const _renderSpy = vi.spyOn(prompt, 'render' as any).mockResolvedValue(undefined);
      const originalInput = 'current input';

      // 履歴を遡る
      await prompt.keypress('', { name: 'up' });

      // 最新まで戻る
      await prompt.keypress('', { name: 'down' });

      expect((prompt as any).isNavigatingHistory).toBe(false);
      expect((prompt as any).input).toBe(originalInput);
    });

    it('should exit history navigation on other keys', async () => {
      // 履歴ナビゲーション開始
      await prompt.keypress('', { name: 'up' });
      expect((prompt as any).isNavigatingHistory).toBe(true);

      // 他のキーでナビゲーション終了
      const superKeypressSpy = vi
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(prompt)), 'keypress')
        .mockResolvedValue(undefined);

      await prompt.keypress('a', { name: 'a' });

      expect((prompt as any).isNavigatingHistory).toBe(false);
      expect(superKeypressSpy).toHaveBeenCalledWith('a', { name: 'a' });
    });
  });

  describe('format', () => {
    beforeEach(() => {
      prompt = new CustomAutocompletePrompt({
        message: 'test>',
      });
      (prompt as any).history = ['cmd1', 'cmd2', 'cmd3'];
    });

    it('should show normal format when not navigating history', () => {
      const formatted = prompt.format('test input');
      expect(formatted).toBe('test input');
    });

    it('should show history indicator when navigating', async () => {
      await prompt.keypress('', { name: 'up' });

      const formatted = prompt.format('cmd3');
      expect(formatted).toBe('[history 3/3] cmd3');
    });
  });

  describe('submit', () => {
    beforeEach(() => {
      prompt = new CustomAutocompletePrompt({
        message: 'test>',
        historyFile: mockHistoryFile,
      });

      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    });

    it('should add input to history on submit', async () => {
      (prompt as any).value = 'submitted command';

      await prompt.submit();

      expect((prompt as any).history).toContain('submitted command');
    });
  });

  describe('multiline support', () => {
    beforeEach(() => {
      prompt = new CustomAutocompletePrompt({
        message: 'test>',
      });
    });

    it('should insert newline on Shift+Enter', async () => {
      const renderSpy = vi.spyOn(prompt, 'render' as any).mockResolvedValue(undefined);
      (prompt as any).input = 'const obj = {';
      (prompt as any).cursor = 13; // at the end

      await prompt.keypress('', { name: 'return', shift: true });

      expect((prompt as any).input).toBe('const obj = {\n  ');
      expect((prompt as any).cursor).toBe(16);
      expect((prompt as any).isMultiline).toBe(true);
      expect(renderSpy).toHaveBeenCalled();
    });

    it('should calculate indent correctly for nested structures', async () => {
      const _renderSpy = vi.spyOn(prompt, 'render' as any).mockResolvedValue(undefined);
      (prompt as any).input = 'const obj = {\n  inner: {';
      (prompt as any).cursor = 24; // at the end

      await prompt.keypress('', { name: 'return', shift: true });

      expect((prompt as any).input).toBe('const obj = {\n  inner: {\n    ');
      expect((prompt as any).cursor).toBe(29); // 4 spaces indent
    });

    it('should auto-continue on unclosed brackets', async () => {
      const _renderSpy = vi.spyOn(prompt, 'render' as any).mockResolvedValue(undefined);
      (prompt as any).input = 'const arr = [';
      (prompt as any).cursor = 13;

      // Regular Enter should also continue multiline
      await prompt.keypress('', { name: 'return', shift: false });

      expect((prompt as any).input).toBe('const arr = [\n  ');
      expect((prompt as any).isMultiline).toBe(true);
    });

    it('should auto-continue on trailing operators', async () => {
      const _renderSpy = vi.spyOn(prompt, 'render' as any).mockResolvedValue(undefined);
      (prompt as any).input = 'const result = 1 +';
      (prompt as any).cursor = 18;

      await prompt.keypress('', { name: 'return', shift: false });

      expect((prompt as any).input).toBe('const result = 1 +\n');
      expect((prompt as any).isMultiline).toBe(true);
    });

    it('should execute normally when brackets are closed', async () => {
      const superKeypressSpy = vi
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(prompt)), 'keypress')
        .mockResolvedValue(undefined);

      (prompt as any).input = 'const obj = {}';
      (prompt as any).cursor = 14;

      await prompt.keypress('', { name: 'return', shift: false });

      expect(superKeypressSpy).toHaveBeenCalledWith('', { name: 'return', shift: false });
    });
  });

  describe('format with multiline', () => {
    beforeEach(() => {
      prompt = new CustomAutocompletePrompt({
        message: 'test>',
      });
    });

    it('should format multiline input correctly', () => {
      (prompt as any).isMultiline = true;

      const formatted = prompt.format('const obj = {\n  name: "test"\n}');
      expect(formatted).toBe('const obj = {\n...  name: "test"\n...}');
    });

    it('should not format single line input', () => {
      (prompt as any).isMultiline = false;

      const formatted = prompt.format('const x = 5');
      expect(formatted).toBe('const x = 5');
    });
  });

  describe('tab completion bug fix', () => {
    beforeEach(() => {
      const mockEngine = {
        getSuggestions: vi.fn().mockReturnValue({
          completions: [],
          replaceStart: 0,
          replaceEnd: 0,
        }),
      };

      prompt = new CustomAutocompletePrompt({
        message: 'test>',
        autocompleteEngine: mockEngine as any,
      });
    });

    it('should not reuse old completion results when pressing tab repeatedly', async () => {
      const renderSpy = vi.spyOn(prompt, 'render' as any).mockResolvedValue(undefined);

      // 最初のタブで補完結果を設定
      (prompt as any).input = '$.value';
      (prompt as any).cursor = 7;
      (prompt as any).completionResult = {
        completions: ['valueOf'],
        replaceStart: 2,
        replaceEnd: 7,
      };

      // 入力を変更
      (prompt as any).input = '$.hasAvailableSubscription';
      (prompt as any).cursor = 26;

      // タブを押す（新しい補完候補なし）
      await prompt.keypress('', { name: 'tab' });

      // completionResultがクリアされていることを確認
      expect((prompt as any).completionResult).toBeUndefined();
      expect(renderSpy).not.toHaveBeenCalled();
    });

    it('should clear completion result after applying completion', async () => {
      const mockEngine = {
        getSuggestions: vi.fn().mockReturnValue({
          completions: ['valueOf'],
          replaceStart: 2,
          replaceEnd: 5,
        }),
      };

      prompt = new CustomAutocompletePrompt({
        message: 'test>',
        autocompleteEngine: mockEngine as any,
      });

      const renderSpy = vi.spyOn(prompt, 'render' as any).mockResolvedValue(undefined);

      (prompt as any).input = '$.val';
      (prompt as any).cursor = 5;

      // タブを押して補完を適用
      await prompt.keypress('', { name: 'tab' });

      // 補完が適用されたことを確認
      expect((prompt as any).input).toBe('$.valueOf');
      expect((prompt as any).completionResult).toBeUndefined();
      expect(renderSpy).toHaveBeenCalled();
    });

    it('should clear completion result when closing completion choices', async () => {
      const renderSpy = vi.spyOn(prompt, 'render' as any).mockResolvedValue(undefined);
      
      // 補完候補を表示中の状態を設定
      (prompt as any).isShowingCompletions = true;
      (prompt as any).choices = [{ name: 'valueOf', value: 'valueOf' }];
      (prompt as any).focused = { name: 'valueOf', value: 'valueOf' };
      (prompt as any).completionResult = {
        completions: ['valueOf'],
        replaceStart: 2,
        replaceEnd: 7,
      };
      (prompt as any).input = '$.val';
      (prompt as any).cursor = 5;

      // タブを押して選択を適用
      await prompt.keypress('', { name: 'tab' });

      // 補完が適用され、状態がクリアされたことを確認
      expect((prompt as any).isShowingCompletions).toBe(false);
      expect((prompt as any).choices).toEqual([]);
      expect((prompt as any).completionResult).toBeUndefined();
      expect(renderSpy).toHaveBeenCalled();
    });
  });
});
