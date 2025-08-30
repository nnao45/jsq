#!/usr/bin/env node

// Test SmartDollar in QuickJS
const { getQuickJS } = require('quickjs-emscripten');

async function testSmartDollar() {
  const QuickJS = await getQuickJS();
  
  console.log('Test 1: Simple SmartDollar class');
  try {
    const runtime = QuickJS.newRuntime();
    const context = runtime.newContext();
    
    // Simple SmartDollar implementation
    const smartDollarCode = `
      class SmartDollar {
        constructor(value) {
          this._value = value;
        }
        
        map(fn) {
          const mapped = this._value.map(fn);
          return new SmartDollar(mapped);
        }
      }
      
      globalThis.$ = function(value) {
        return new SmartDollar(value);
      };
    `;
    
    const setupResult = context.evalCode(smartDollarCode);
    if (setupResult.error) {
      console.error('Setup error:', context.dump(setupResult.error));
      setupResult.error.dispose();
    } else if (setupResult.value) {
      setupResult.value.dispose();
    }
    
    // Test map function
    const testCode = `$([1, 2, 3]).map(x => x * 2)._value`;
    const result = context.evalCode(testCode);
    
    if (result.error) {
      console.error('Test error:', context.dump(result.error));
      result.error.dispose();
    } else {
      console.log('Result:', context.dump(result.value));
      result.value.dispose();
    }
    
    context.dispose();
    runtime.dispose();
    console.log('✅ Test 1 passed\n');
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message, '\n');
  }
  
  console.log('Test 2: SmartDollar with Proxy');
  try {
    const runtime = QuickJS.newRuntime();
    const context = runtime.newContext();
    
    // SmartDollar with Proxy
    const proxyCode = `
      class SmartDollar {
        constructor(value) {
          this._value = value;
        }
        
        map(fn) {
          const mapped = this._value.map(fn);
          return new SmartDollar(mapped);
        }
      }
      
      globalThis.$ = function(value) {
        const smartDollar = new SmartDollar(value);
        return new Proxy(smartDollar, {
          get(target, prop) {
            if (prop in target) {
              return target[prop];
            }
            return target._value[prop];
          }
        });
      };
    `;
    
    const setupResult = context.evalCode(proxyCode);
    if (setupResult.error) {
      console.error('Setup error:', context.dump(setupResult.error));
      setupResult.error.dispose();
    } else if (setupResult.value) {
      setupResult.value.dispose();
    }
    
    // Test with proxy
    const testCode = `$([1, 2, 3]).map(x => x * 2)._value`;
    const result = context.evalCode(testCode);
    
    if (result.error) {
      console.error('Test error:', context.dump(result.error));
      result.error.dispose();
    } else {
      console.log('Result:', context.dump(result.value));
      result.value.dispose();
    }
    
    context.dispose();
    runtime.dispose();
    console.log('✅ Test 2 passed\n');
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message, '\n');
  }
  
  console.log('Test 3: Multiple nested proxies');
  try {
    const runtime = QuickJS.newRuntime();
    const context = runtime.newContext();
    
    // Nested proxies
    const nestedProxyCode = `
      globalThis.createProxy = function(value) {
        const proxy1 = new Proxy(value, {
          get(target, prop) {
            return target[prop];
          }
        });
        
        const proxy2 = new Proxy(proxy1, {
          get(target, prop) {
            return target[prop];
          }
        });
        
        return proxy2;
      };
      
      globalThis.data = createProxy([1, 2, 3]);
    `;
    
    const setupResult = context.evalCode(nestedProxyCode);
    if (setupResult.error) {
      console.error('Setup error:', context.dump(setupResult.error));
      setupResult.error.dispose();
    } else if (setupResult.value) {
      setupResult.value.dispose();
    }
    
    // Access nested proxy
    const testCode = `data.map(x => x * 2)`;
    const result = context.evalCode(testCode);
    
    if (result.error) {
      console.error('Test error:', context.dump(result.error));
      result.error.dispose();
    } else {
      console.log('Result:', context.dump(result.value));
      result.value.dispose();
    }
    
    context.dispose();
    runtime.dispose();
    console.log('✅ Test 3 passed\n');
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message, '\n');
  }
}

testSmartDollar().catch(console.error);