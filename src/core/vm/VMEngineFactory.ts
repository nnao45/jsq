import type { VMEngine, VMEngineFactory as IVMEngineFactory } from './interfaces/VMEngine';
import { QuickJSEngine } from './engines/quickjs/QuickJSEngine';
import { IsolatedVMEngine } from './engines/isolated-vm/IsolatedVMEngine';

export class VMEngineFactory implements IVMEngineFactory {
  create(type: 'isolated-vm' | 'quickjs'): VMEngine {
    switch (type) {
      case 'quickjs':
        return new QuickJSEngine();
      case 'isolated-vm':
        return new IsolatedVMEngine();
      default:
        throw new Error(`Unknown VM engine type: ${type}`);
    }
  }
}

export function getVMEngineType(): 'isolated-vm' | 'quickjs' {
  // 環境変数でエンジンを選択
  const engineType = process.env.JSQ_VM_ENGINE?.toLowerCase();
  
  if (engineType === 'quickjs') {
    // In test environment, QuickJS requires special flags that break Jest
    // So we fallback to isolated-vm for tests unless explicitly forced
    if (process.env.NODE_ENV === 'test' && process.env.FORCE_QUICKJS !== 'true') {
      console.warn(
        'QuickJS is not compatible with Jest without --experimental-vm-modules flag. ' +
        'Falling back to isolated-vm for tests. Use FORCE_QUICKJS=true to override.'
      );
      return 'isolated-vm';
    }
    return 'quickjs';
  }
  
  if (engineType === 'isolated-vm') {
    return 'isolated-vm';
  }
  
  // デフォルトはquickjs（ただし、テスト環境ではisolated-vm）
  // **DO NOT CHANGE** QuickJSは初期化に問題があるけど、isolated-vmは廃止予定だからまずはquickjsを直せ！
  if (process.env.NODE_ENV === 'test') {
    return 'isolated-vm';
  }
  return 'quickjs';
}