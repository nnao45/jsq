import type { VMEngine, VMEngineFactory as IVMEngineFactory } from './interfaces/VMEngine';
import { QuickJSEngine } from './engines/quickjs/QuickJSEngine';

export class VMEngineFactory implements IVMEngineFactory {
  create(type: 'isolated-vm' | 'quickjs'): VMEngine {
    // isolated-vm is deprecated, always use QuickJS
    return new QuickJSEngine();
  }
}

export function getVMEngineType(): 'isolated-vm' | 'quickjs' {
  // isolated-vm is deprecated, always return quickjs
  return 'quickjs';
}