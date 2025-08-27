# quickjs-emscripten Node.js調査レポート

## 1. npmパッケージとしての利用可能性

### インストール方法
```bash
npm install quickjs-emscripten
# または
yarn add quickjs-emscripten
```

### 対応環境
- Node.js: v16.0.0以降が必要（WebAssemblyサポートのため）
- TypeScript: 4.5.5および5.3.3でテスト済み
- ブラウザ: 現代的なブラウザすべてに対応
- その他: Cloudflare Workers、Denoでも動作確認済み

## 2. Node.jsでの基本的な使用例

### シンプルな例
```javascript
import { getQuickJS } from 'quickjs-emscripten'

async function main() {
  const QuickJS = await getQuickJS()
  const vm = QuickJS.newContext()
  
  // グローバル変数の設定
  const world = vm.newString('world')
  vm.setProp(vm.global, 'NAME', world)
  world.dispose()
  
  // コードの実行
  const result = vm.evalCode(`"Hello " + NAME + "!"`)
  
  if (result.error) {
    console.log('Execution failed:', vm.dump(result.error))
    result.error.dispose()
  } else {
    console.log('Success:', vm.dump(result.value))
    result.value.dispose()
  }
  
  vm.dispose()
}

main()
```

### より高度な実装例（Node.js互換API付き）
```javascript
import { quickJS } from '@sebastianwessel/quickjs'

const { createRuntime } = await quickJS()

const { evalCode } = await createRuntime({
  allowFetch: true,
  allowFs: true,
  env: {
    MY_ENV_VAR: 'env var value'
  },
})

const result = await evalCode(`
  import { join } from 'node:path'
  import { writeFileSync, readFileSync } from 'node:fs'
  import assert from 'node:assert'
  
  const fn = async () => {
    console.log(join('src', 'dist'))
    console.log(env.MY_ENV_VAR)
    
    // ファイルシステムの使用
    writeFileSync('/test.txt', 'Hello, QuickJS!')
    const content = readFileSync('/test.txt', 'utf8')
    assert.strictEqual(content, 'Hello, QuickJS!')
    
    // fetchの使用
    const url = new URL('https://example.com')
    const f = await fetch(url)
    return f.text()
  }
  
  export default await fn()
`)

console.log(result)
```

## 3. ブラウザとNode.js両方で動作するコード

### アイソモーフィックな設定（package.json）
```json
{
  "imports": {
    "#my-quickjs-variant": {
      "types": "@jitl/quickjs-wasmfile-release-sync",
      "browser": "@jitl/quickjs-singlefile-browser-release-sync",
      "default": "@jitl/quickjs-wasmfile-release-sync"
    }
  }
}
```

### 共通コード
```javascript
import { newQuickJSWASMModuleFromVariant } from "quickjs-emscripten-core"
import variant from "#my-quickjs-variant"

const QuickJS = await newQuickJSWASMModuleFromVariant(variant)
const vm = QuickJS.newContext()

// 以下はブラウザでもNode.jsでも同じように動作
const result = vm.evalCode(`
  function fibonacci(n) {
    if (n <= 1) return n
    return fibonacci(n - 1) + fibonacci(n - 2)
  }
  fibonacci(10)
`)

console.log('Result:', vm.dump(result.value))
```

## 4. パフォーマンスとメモリ使用量の比較

### quickjs-emscripten
**長所：**
- 起動時間が非常に速い（300マイクロ秒以下でインスタンスのライフサイクルが完了）
- メモリフットプリントが小さい（Hello Worldで367KB）
- WebAssemblyベースなので環境依存が少ない
- ブラウザでも動作可能

**短所：**
- 実行速度はV8より遅い（インタープリタベース）
- Asyncifyを使用すると2倍のサイズになり、パフォーマンスが低下
- ECMAScriptの一部の最新機能はサポートされない場合がある

### isolated-vm
**長所：**
- ほぼネイティブV8の速度で実行
- 完全なV8互換性
- 長時間実行されるスクリプトに最適
- より強力な分離機能（個別のV8 Isolate）

**短所：**
- 起動時間が遅い（V8 Isolateの作成オーバーヘッド）
- メモリ使用量が多い
- Node.js環境でのみ動作
- ネイティブモジュールが必要

## 5. isolated-vmとの比較表

| 項目 | quickjs-emscripten | isolated-vm |
|------|-------------------|-------------|
| 環境サポート | Node.js、ブラウザ、Deno、CF Workers | Node.jsのみ |
| 起動時間 | 非常に速い（< 300μs） | 遅い（Isolate作成のオーバーヘッド） |
| 実行速度 | 遅い（インタープリタ） | 速い（ネイティブV8） |
| メモリ使用量 | 少ない（数百KB） | 多い（Isolateごとに数MB） |
| セキュリティ | WebAssemblyサンドボックス | V8 Isolate分離 |
| ビルドサイズ | 500KB（通常）～1MB（Async版） | N/A（ネイティブモジュール） |
| ECMAScript準拠 | ほぼ完全（一部制限あり） | 完全なV8互換 |
| メンテナンス | 活発に開発中 | 安定しているが新機能追加は少ない |

## 推奨される使用ケース

### quickjs-emscriptenを使うべき場合
- 起動時間が重要な場合（サーバーレス環境など）
- メモリ使用量を最小限にしたい場合
- ブラウザでも同じコードを実行したい場合
- ネイティブモジュールをインストールできない環境
- 予測可能で決定論的な実行が必要な場合

### isolated-vmを使うべき場合
- 長時間実行されるスクリプトの場合
- 最高の実行パフォーマンスが必要な場合
- 完全なV8互換性が必要な場合
- すでにNode.js環境に限定されている場合

## 実装例：jsqプロジェクトでquickjs-emscriptenを使用する場合

```javascript
// src/core/vm/quickjs-executor.ts
import { getQuickJS } from 'quickjs-emscripten'
import type { QuickJSContext } from 'quickjs-emscripten'

export class QuickJSExecutor {
  private vm: QuickJSContext | null = null
  
  async initialize() {
    const QuickJS = await getQuickJS()
    this.vm = QuickJS.newContext()
    
    // メモリ制限の設定
    this.vm.runtime.setMemoryLimit(50 * 1024 * 1024) // 50MB
    
    // CPU時間制限の設定
    this.vm.runtime.setMaxStackSize(1024 * 512) // 512KB
  }
  
  execute(code: string, context: Record<string, any> = {}) {
    if (!this.vm) throw new Error('VM not initialized')
    
    // コンテキストの設定
    for (const [key, value] of Object.entries(context)) {
      const jsValue = this.vm.newString(JSON.stringify(value))
      this.vm.setProp(this.vm.global, key, jsValue)
      jsValue.dispose()
    }
    
    // コードの実行
    const result = this.vm.evalCode(code)
    
    if (result.error) {
      const error = this.vm.dump(result.error)
      result.error.dispose()
      throw new Error(`Execution failed: ${error}`)
    }
    
    const value = this.vm.dump(result.value)
    result.value.dispose()
    return value
  }
  
  dispose() {
    if (this.vm) {
      this.vm.dispose()
      this.vm = null
    }
  }
}
```

## まとめ

quickjs-emscriptenは、軽量で高速な起動時間を持つJavaScriptサンドボックスソリューションです。特にブラウザとNode.jsの両方で動作する必要がある場合や、メモリ制約が厳しい環境では優れた選択肢となります。一方で、実行速度が重要な場合や完全なV8互換性が必要な場合は、isolated-vmの方が適しています。

jsqプロジェクトの場合、CLIツールという性質上、起動時間の速さとメモリ効率の良さは大きな利点となる可能性があります。ただし、複雑なJavaScriptコードの実行が必要な場合は、パフォーマンスの観点からisolated-vmの方が適している可能性もあります。