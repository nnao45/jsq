// mapメソッドの問題を直接チェック！

// arrayMethodsの中身を確認
const arrayMethods = {
  map: function(target, ...args) {
    console.log('Custom map called!');
    console.log('Target:', target);
    console.log('Args:', args);
    const mapped = Array.prototype.map.apply(target, args);
    console.log('Mapped result:', mapped);
    return mapped;
  },
  orderBy: function(target, keys, orders) {
    console.log('orderBy called!');
    return target;
  }
};

// Proxyのgetハンドラーをテスト
const handler = {
  get(target, prop) {
    console.log(`Getting property: ${String(prop)}`);
    
    // First check if it's a method we've defined
    if (arrayMethods[prop] !== undefined) {
      console.log(`Found in arrayMethods: ${String(prop)}`);
      return function(...args) {
        return arrayMethods[prop](target, ...args);
      };
    }
    
    // For array properties and native methods
    const value = target[prop];
    console.log(`Native property ${String(prop)}: ${typeof value}`);
    if (typeof value === 'function') {
      return value.bind(target);
    }
    return value;
  }
};

// テスト実行
const testArray = [1, 2, 3];
const proxy = new Proxy(testArray, handler);

console.log('\n=== Testing map ===');
const mapped = proxy.map(x => x * 2);
console.log('Result type:', typeof mapped);
console.log('Result is array?', Array.isArray(mapped));
console.log('Result:', mapped);

console.log('\n=== Testing if result has orderBy ===');
console.log('mapped.orderBy type:', typeof mapped.orderBy);