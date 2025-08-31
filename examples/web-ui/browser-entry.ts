// JSQのコア機能をブラウザ向けにエクスポート
import type { JsqOptions } from '@/types/cli';

// ブラウザ環境のグローバル設定
(globalThis as any).process = {
  env: {
    NODE_ENV: 'production'
  }
};

// ExpressionEvaluatorをブラウザ用に調整したラッパー
export class JSQBrowser {
  private evaluatorModule: any = null;
  private transformerModule: any = null;
  
  async initialize() {
    // 動的インポートでコアモジュールを読み込み
    const [evaluatorMod, transformerMod] = await Promise.all([
      import('@/core/lib/evaluator'),
      import('@/core/lib/expression-transformer')
    ]);
    
    this.evaluatorModule = evaluatorMod;
    this.transformerModule = transformerMod;
    
    console.log('JSQ Browser initialized');
    return this;
  }
  
  async evaluate(expression: string, data: any, options?: Partial<JsqOptions>) {
    if (!this.evaluatorModule) {
      throw new Error('JSQ not initialized. Call initialize() first.');
    }
    
    const defaultOptions: JsqOptions = {
      sandbox: true,
      verbose: false,
      memoryLimit: 128, // MB
      cpuLimit: 30000,  // ms
      ...options
    };
    
    // Import and create proper ApplicationContext for browser
    const { createApplicationContext } = await import('@/core/application-context');
    const appContext = createApplicationContext();
    
    const evaluator = new this.evaluatorModule.ExpressionEvaluator(defaultOptions, appContext);
    
    try {
      const result = await evaluator.evaluate(expression, data);
      return result;
    } finally {
      await evaluator.dispose();
      await appContext.dispose();
    }
  }
  
  transform(expression: string): string {
    if (!this.transformerModule) {
      throw new Error('JSQ not initialized. Call initialize() first.');
    }
    
    return this.transformerModule.ExpressionTransformer.transform(expression);
  }
}

// グローバル変数として公開
(window as any).JSQ = JSQBrowser;

// 自動初期化も提供
export const jsq = new JSQBrowser();
(window as any).jsq = jsq;

// DOMContentLoadedで自動初期化
if (typeof window !== 'undefined' && window.document) {
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await jsq.initialize();
      console.log('JSQ auto-initialized');
    } catch (error) {
      console.error('Failed to auto-initialize JSQ:', error);
    }
  });
}