import type { ApplicationContext } from '../application-context';
import { QuickJSEngine } from './engines/quickjs/QuickJSEngine';
import type { VMEngineFactory as IVMEngineFactory, VMEngine } from './interfaces/VMEngine';

export class VMEngineFactory implements IVMEngineFactory {
  constructor(private appContext: ApplicationContext) {}

  create(_type: 'quickjs'): VMEngine {
    return new QuickJSEngine(this.appContext);
  }
}

export function getVMEngineType(): 'quickjs' {
  return 'quickjs';
}
