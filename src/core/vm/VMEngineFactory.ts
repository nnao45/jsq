import { QuickJSEngine } from './engines/quickjs/QuickJSEngine';
import type { VMEngineFactory as IVMEngineFactory, VMEngine } from './interfaces/VMEngine';

export class VMEngineFactory implements IVMEngineFactory {
  create(_type: 'quickjs'): VMEngine {
    return new QuickJSEngine();
  }
}

export function getVMEngineType(): 'quickjs' {
  return 'quickjs';
}
