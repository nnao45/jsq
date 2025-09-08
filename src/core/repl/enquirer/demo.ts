#!/usr/bin/env node

/**
 * Enquirer REPL デモスクリプト
 * 使い方: npx tsx src/core/repl/enquirer/demo.ts
 */

import { EnquirerReplManager } from './enquirer-repl-manager.js';
import { JsqEvaluator } from '../../evaluator/jsq-evaluator.js';
import { Logger } from '../../utils/logger.js';

async function main() {
  // ロガーの準備
  const logger = new Logger({ level: 'info' });
  
  // 評価エンジンの準備
  const evaluator = new JsqEvaluator({ 
    logger,
    enableAsync: true 
  });

  // サンプルデータをセット
  const sampleData = {
    users: [
      { id: 1, name: 'Alice', age: 25, skills: ['JavaScript', 'Python'] },
      { id: 2, name: 'Bob', age: 30, skills: ['Java', 'Go'] },
      { id: 3, name: 'Charlie', age: 35, skills: ['Ruby', 'PHP'] }
    ],
    products: [
      { id: 101, name: 'Laptop', price: 1200, category: 'Electronics' },
      { id: 102, name: 'Mouse', price: 25, category: 'Electronics' },
      { id: 103, name: 'Keyboard', price: 75, category: 'Electronics' }
    ],
    metadata: {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: 'development'
    }
  };

  evaluator.setData(sampleData);
  console.log('Sample data loaded:', JSON.stringify(sampleData, null, 2));
  console.log('\n---\n');
  console.log('✨ New features in Enquirer Edition:');
  console.log('  • 📚 History navigation with ↑/↓ keys');
  console.log('  • 📝 Multiline input with Shift+Enter');
  console.log('  • 🎯 Smart auto-continue for unclosed brackets');
  console.log('  • ❌ Friendly error messages with hints');
  console.log('  • 💾 Save/load sessions (.save, .load)');
  console.log('  • ⚙️  Configuration display (.config)');
  console.log('\nTry these examples:');
  console.log('  users.filter(u => u.age > 25)');
  console.log('  $.products.map(p => ({');
  console.log('    name: p.name,');
  console.log('    discountPrice: p.price * 0.9');
  console.log('  }))');
  console.log('\n---\n');

  // Enquirer REPLの起動
  const repl = new EnquirerReplManager({
    evaluator,
    logger
  });

  try {
    await repl.start();
  } catch (error) {
    console.error('Demo error:', error);
  }
}

// エラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// メイン処理の実行
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});