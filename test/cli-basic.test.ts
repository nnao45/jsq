import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';

describe('CLI Basic Tests', () => {
  it('should process stdin and output JSON', () => {
    const input = '{"message": [1,2,3]}';
    const output = execSync('node dist/index.js', {
      input,
      encoding: 'utf-8',
    });
    
    const parsed = JSON.parse(output);
    expect(parsed).toEqual({ message: [1, 2, 3] });
  });

  it('should process stdin with expression', () => {
    const input = '{"message": [1,2,3]}';
    const output = execSync('node dist/index.js "$.message"', {
      input,
      encoding: 'utf-8',
    });
    
    const parsed = JSON.parse(output);
    expect(parsed).toEqual([1, 2, 3]);
  });

  it('should save stdin to tmp file when using --repl', () => {
    const input = '{"message": [1,2,3]}';
    
    // タイムアウトで強制終了（REPLはインタラクティブなので）
    try {
      execSync('timeout 1 node dist/index.js --repl', {
        input,
        encoding: 'utf-8',
      });
    } catch (error) {
      // timeoutの終了コードは無視
    }
    
    // TMPファイルが作成されたか確認（ファイル名はプロセス依存なので、存在だけ確認）
    const tmpFiles = execSync('ls /tmp/jsq-stdin-data-*.json 2>/dev/null || true', {
      encoding: 'utf-8',
    }).trim();
    
    // 少なくとも1つのファイルがあることを確認
    expect(tmpFiles.length).toBeGreaterThan(0);
  });

  it('should process file with --file option', () => {
    const testFile = '/tmp/test-input.json';
    const testData = { test: 'data', value: 42 };
    
    try {
      writeFileSync(testFile, JSON.stringify(testData));
      
      const output = execSync(`node dist/index.js --file ${testFile} "$.test"`, {
        encoding: 'utf-8',
      });
      
      expect(output.trim()).toBe('"data"');
    } finally {
      try {
        unlinkSync(testFile);
      } catch {}
    }
  });
});