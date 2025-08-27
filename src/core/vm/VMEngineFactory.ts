import type { VMEngine, VMEngineFactory as IVMEngineFactory } from './interfaces/VMEngine';
import { QuickJSEngine } from './engines/quickjs/QuickJSEngine';

export class VMEngineFactory implements IVMEngineFactory {
  create(_type: 'quickjs'): VMEngine {
    return new QuickJSEngine();
  }
}

export function getVMEngineType(): 'quickjs' {
  return 'quickjs';
}