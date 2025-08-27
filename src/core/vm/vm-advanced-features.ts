// QuickJS types
type IvmReference = {
  set(key: string, value: unknown, options?: { reference?: boolean }): Promise<void>;
  setSync(key: string, value: unknown, options?: { reference?: boolean }): void;
  get(key: string, options?: { reference?: boolean }): Promise<unknown>;
  getSync(key: string, options?: { reference?: boolean }): unknown;
};

type IvmIsolate = {
  createContext(): Promise<unknown>;
  dispose(): void;
};

export class VMAdvancedFeatures {
  /**
   * Set up async/await support in the VM
   */
  static async setupAsyncSupport(jail: IvmReference, _isolate: IvmIsolate): Promise<void> {
    // Promise constructor is already provided by the VM
    // We need to ensure proper async function execution

    // Add setTimeout/setInterval support for async operations
    await jail.set(
      'setTimeout',
      (fn: () => void, _delay: number) => {
        // In sandbox, we don't actually delay, just execute immediately
        // Real delay would require more complex implementation
        try {
          fn();
        } catch (error) {
          console.error('setTimeout error:', error);
        }
      },
      { reference: true }
    );

    await jail.set(
      'setImmediate',
      (fn: () => void) => {
        try {
          fn();
        } catch (error) {
          console.error('setImmediate error:', error);
        }
      },
      { reference: true }
    );

    // Add Promise utilities
    await jail.set('PromiseHelpers', {}, { reference: true });
    const promiseHelpers = await jail.get('PromiseHelpers', { reference: true });

    await (promiseHelpers as IvmReference).set(
      'delay',
      (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
      { reference: true }
    );

    await (promiseHelpers as IvmReference).set(
      'timeout',
      (promise: Promise<unknown>, ms: number) => {
        return Promise.race([
          promise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
          ),
        ]);
      },
      { reference: true }
    );
  }

  /**
   * Set up generator function support
   */
  static async setupGeneratorSupport(jail: IvmReference, _isolate: IvmIsolate): Promise<void> {
    // Generators are supported natively in modern V8
    // We just need to ensure proper iteration protocol

    await jail.set('GeneratorHelpers', {}, { reference: true });
    const genHelpers = await jail.get('GeneratorHelpers', { reference: true });

    // Helper to convert generator to array
    await (genHelpers as IvmReference).set(
      'toArray',
      function* (generator: Generator) {
        const result = [];
        for (const value of generator) {
          result.push(value);
        }
        return result;
      },
      { reference: true }
    );

    // Helper for async generators
    await (genHelpers as IvmReference).set(
      'asyncToArray',
      async function* (generator: AsyncGenerator) {
        const result = [];
        for await (const value of generator) {
          result.push(value);
        }
        return result;
      },
      { reference: true }
    );
  }

  /**
   * Set up Proxy support
   */
  static async setupProxySupport(jail: IvmReference, _isolate: IvmIsolate): Promise<void> {
    // Proxy support requires careful handling due to security implications
    // We provide a limited, safe version

    await jail.set('SafeProxy', {}, { reference: true });
    const safeProxy = await jail.get('SafeProxy', { reference: true });

    await (safeProxy as IvmReference).set(
      'create',
      (target: object, handler: ProxyHandler<object>) => {
        // Validate handler to ensure it doesn't contain dangerous operations
        const allowedTraps = ['get', 'set', 'has', 'deleteProperty', 'ownKeys'];
        const providedTraps = Object.keys(handler);

        for (const trap of providedTraps) {
          if (!allowedTraps.includes(trap)) {
            throw new Error(`Proxy trap '${trap}' is not allowed in sandbox`);
          }
        }

        return new Proxy(target as object, handler as ProxyHandler<object>);
      },
      { reference: true }
    );
  }

  /**
   * Set up Symbol support
   */
  static async setupSymbolSupport(jail: IvmReference, _isolate: IvmIsolate): Promise<void> {
    // Symbols are already supported, but we add utilities
    await jail.set('SymbolHelpers', {}, { reference: true });
    const symbolHelpers = await jail.get('SymbolHelpers', { reference: true });

    // Well-known symbols
    const wellKnownSymbols = [
      'iterator',
      'asyncIterator',
      'hasInstance',
      'isConcatSpreadable',
      'match',
      'replace',
      'search',
      'species',
      'split',
      'toPrimitive',
      'toStringTag',
      'unscopables',
    ];

    for (const symbolName of wellKnownSymbols) {
      const symbolKey = Symbol[symbolName as keyof typeof Symbol];
      if (typeof symbolKey === 'symbol') {
        await (symbolHelpers as any).set(symbolName, symbolKey, { reference: true });
      }
    }
  }

  /**
   * Set up WeakMap and WeakSet support
   */
  static async setupWeakCollections(jail: IvmReference, _isolate: IvmIsolate): Promise<void> {
    // WeakMap and WeakSet are natively supported
    // We add helper utilities

    await jail.set('WeakHelpers', {}, { reference: true });
    const weakHelpers = await jail.get('WeakHelpers', { reference: true });

    await (weakHelpers as any).set(
      'createCache',
      () => {
        const cache = new WeakMap();
        return {
          get: (key: any) => cache.get(key),
          set: (key: any, value: any) => cache.set(key, value),
          has: (key: any) => cache.has(key),
          delete: (key: any) => cache.delete(key),
        };
      },
      { reference: true }
    );
  }

  /**
   * Set up typed array support
   */
  static async setupTypedArrays(jail: IvmReference, _isolate: IvmIsolate): Promise<void> {
    const typedArrays = [
      'Int8Array',
      'Uint8Array',
      'Uint8ClampedArray',
      'Int16Array',
      'Uint16Array',
      'Int32Array',
      'Uint32Array',
      'Float32Array',
      'Float64Array',
      'BigInt64Array',
      'BigUint64Array',
    ];

    for (const arrayType of typedArrays) {
      const ArrayConstructor = global[arrayType as keyof typeof global];
      if (typeof ArrayConstructor === 'function') {
        await jail.set(arrayType, ArrayConstructor, { reference: true });
      }
    }

    // Add ArrayBuffer and DataView
    await jail.set('ArrayBuffer', ArrayBuffer, { reference: true });
    await jail.set('DataView', DataView, { reference: true });
  }

  /**
   * Set up Intl (Internationalization) support
   */
  static async setupIntlSupport(jail: IvmReference, _isolate: IvmIsolate): Promise<void> {
    // Create a limited Intl object with safe constructors
    await jail.set('Intl', {}, { reference: true });
    const intlObj = await jail.get('Intl', { reference: true });

    // Add safe Intl constructors
    const intlConstructors = [
      'DateTimeFormat',
      'NumberFormat',
      'Collator',
      'PluralRules',
      'RelativeTimeFormat',
      'ListFormat',
      'Locale',
    ];

    for (const ctor of intlConstructors) {
      const IntlConstructor = (Intl as any)[ctor];
      if (IntlConstructor) {
        await (intlObj as any).set(ctor, (...args: any[]) => new IntlConstructor(...args), {
          reference: true,
        });
      }
    }
  }

  /**
   * Set up BigInt support
   */
  static async setupBigIntSupport(jail: IvmReference, _isolate: IvmIsolate): Promise<void> {
    await jail.set('BigInt', BigInt, { reference: true });

    // Add BigInt utilities
    await jail.set('BigIntHelpers', {}, { reference: true });
    const bigIntHelpers = await jail.get('BigIntHelpers', { reference: true });

    await (bigIntHelpers as any).set('fromNumber', (n: number) => BigInt(Math.floor(n)), {
      reference: true,
    });

    await (bigIntHelpers as any).set('toNumber', (b: bigint) => Number(b), {
      reference: true,
    });
  }

  /**
   * Set up custom iterators and iteration protocols
   */
  static async setupIterationProtocols(jail: IvmReference, _isolate: IvmIsolate): Promise<void> {
    await jail.set('IteratorHelpers', {}, { reference: true });
    const iterHelpers = await jail.get('IteratorHelpers', { reference: true });

    // Helper to create custom iterators
    await (iterHelpers as any).set(
      'create',
      (items: any[]) => {
        let index = 0;
        return {
          [Symbol.iterator]() {
            return {
              next() {
                if (index < items.length) {
                  return { value: items[index++], done: false };
                }
                return { value: undefined, done: true };
              },
            };
          },
        };
      },
      { reference: true }
    );

    // Helper for async iterators
    await (iterHelpers as any).set(
      'createAsync',
      (items: any[]) => {
        let index = 0;
        return {
          [Symbol.asyncIterator]() {
            return {
              async next() {
                if (index < items.length) {
                  return { value: items[index++], done: false };
                }
                return { value: undefined, done: true };
              },
            };
          },
        };
      },
      { reference: true }
    );
  }

  /**
   * Set up error handling and stack trace improvements
   */
  static async setupErrorHandling(jail: IvmReference, _isolate: IvmIsolate): Promise<void> {
    // Enhanced error constructors
    const errorTypes = [
      'Error',
      'TypeError',
      'ReferenceError',
      'SyntaxError',
      'RangeError',
      'URIError',
      'EvalError',
    ];

    for (const errorType of errorTypes) {
      const ErrorConstructor = global[errorType as keyof typeof global];
      if (typeof ErrorConstructor === 'function') {
        await jail.set(
          errorType,
          (...args: any[]) => {
            const error = new (ErrorConstructor as any)(...args);
            // Capture stack trace for better debugging
            if (Error.captureStackTrace) {
              Error.captureStackTrace(error, ErrorConstructor);
            }
            return error;
          },
          { reference: true }
        );
      }
    }

    // Add custom error class support
    await jail.set(
      'CustomError',
      class CustomError extends Error {
        constructor(
          message: string,
          public code?: string,
          public details?: any
        ) {
          super(message);
          this.name = 'CustomError';
          if (Error.captureStackTrace) {
            Error.captureStackTrace(this, CustomError);
          }
        }
      },
      { reference: true }
    );
  }

  /**
   * Set up all advanced features based on capabilities
   */
  static async setupAllFeatures(
    jail: IvmReference,
    isolate: IvmIsolate,
    capabilities: {
      enableAsync?: boolean;
      enableGenerators?: boolean;
      enableProxies?: boolean;
      enableSymbols?: boolean;
      enableWeakCollections?: boolean;
      enableTypedArrays?: boolean;
      enableIntl?: boolean;
      enableBigInt?: boolean;
      enableIterators?: boolean;
      enableErrorHandling?: boolean;
    }
  ): Promise<void> {
    if (capabilities.enableAsync) {
      await VMAdvancedFeatures.setupAsyncSupport(jail, isolate);
    }

    if (capabilities.enableGenerators) {
      await VMAdvancedFeatures.setupGeneratorSupport(jail, isolate);
    }

    if (capabilities.enableProxies) {
      await VMAdvancedFeatures.setupProxySupport(jail, isolate);
    }

    if (capabilities.enableSymbols) {
      await VMAdvancedFeatures.setupSymbolSupport(jail, isolate);
    }

    if (capabilities.enableWeakCollections) {
      await VMAdvancedFeatures.setupWeakCollections(jail, isolate);
    }

    if (capabilities.enableTypedArrays) {
      await VMAdvancedFeatures.setupTypedArrays(jail, isolate);
    }

    if (capabilities.enableIntl) {
      await VMAdvancedFeatures.setupIntlSupport(jail, isolate);
    }

    if (capabilities.enableBigInt) {
      await VMAdvancedFeatures.setupBigIntSupport(jail, isolate);
    }

    if (capabilities.enableIterators) {
      await VMAdvancedFeatures.setupIterationProtocols(jail, isolate);
    }

    if (capabilities.enableErrorHandling) {
      await VMAdvancedFeatures.setupErrorHandling(jail, isolate);
    }
  }
}
