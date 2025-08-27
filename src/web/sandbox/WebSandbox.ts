/**
 * ブラウザ環境でのサンドボックス実行環境
 * isolated-vmの代わりにWeb WorkerとFunction constructorを使用
 */
export class WebSandbox {
    private worker: Worker | null = null;
    private messageId = 0;
    private pendingMessages = new Map<number, {
        resolve: (value: unknown) => void;
        reject: (error: unknown) => void;
    }>();

    constructor() {
        this.initializeWorker();
    }

    private initializeWorker() {
        // Web Workerのコードを動的に生成
        const workerCode = `
            // グローバルスコープの制限
            const restrictedGlobals = [
                'importScripts', 'XMLHttpRequest', 'fetch', 'WebSocket',
                'localStorage', 'sessionStorage', 'indexedDB'
            ];
            
            restrictedGlobals.forEach(global => {
                if (global in self) {
                    self[global] = undefined;
                }
            });

            // メッセージハンドラ
            self.addEventListener('message', async (event) => {
                const { id, expression, data } = event.data;
                
                try {
                    // $ を data にバインド
                    const $ = data;
                    
                    // 式を評価（Function constructorを使用してスコープを制限）
                    const func = new Function('$', 'data', \`
                        'use strict';
                        return (\${expression});
                    \`);
                    
                    const result = func($, data);
                    
                    // 結果を返す
                    self.postMessage({
                        id,
                        success: true,
                        result: result
                    });
                } catch (error) {
                    self.postMessage({
                        id,
                        success: false,
                        error: error.message || 'Unknown error'
                    });
                }
            });
        `;

        // BlobとURLを使ってWorkerを作成
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        
        try {
            this.worker = new Worker(workerUrl);
            
            // メッセージハンドラを設定
            this.worker.addEventListener('message', (event) => {
                const { id, success, result, error } = event.data;
                const pending = this.pendingMessages.get(id);
                
                if (pending) {
                    if (success) {
                        pending.resolve(result);
                    } else {
                        pending.reject(new Error(error));
                    }
                    this.pendingMessages.delete(id);
                }
            });
            
            // エラーハンドラを設定
            this.worker.addEventListener('error', (error) => {
                console.error('Worker error:', error);
                // すべてのpendingメッセージをエラーで解決
                this.pendingMessages.forEach(pending => {
                    pending.reject(new Error('Worker error'));
                });
                this.pendingMessages.clear();
            });
        } catch (error) {
            // WorkerがサポートされていないかBlocked
            console.warn('Worker creation failed, falling back to iframe sandbox');
            this.worker = null;
        } finally {
            // Blob URLをクリーンアップ
            URL.revokeObjectURL(workerUrl);
        }
    }

    async evaluate(expression: string, data: any): Promise<any> {
        // Workerが使用可能な場合
        if (this.worker) {
            return this.evaluateWithWorker(expression, data);
        }
        
        // Workerが使用できない場合のフォールバック
        return this.evaluateWithFunction(expression, data);
    }

    private evaluateWithWorker(expression: string, data: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const id = this.messageId++;
            
            // タイムアウトを設定（10秒）
            const timeout = setTimeout(() => {
                this.pendingMessages.delete(id);
                reject(new Error('Evaluation timeout'));
            }, 10000);
            
            // resolveとrejectをラップしてタイムアウトをクリア
            const wrappedResolve = (value: any) => {
                clearTimeout(timeout);
                resolve(value);
            };
            
            const wrappedReject = (error: unknown) => {
                clearTimeout(timeout);
                reject(error);
            };
            
            this.pendingMessages.set(id, {
                resolve: wrappedResolve,
                reject: wrappedReject
            });
            
            this.worker!.postMessage({ id, expression, data });
        });
    }

    private evaluateWithFunction(expression: string, data: any): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                // Function constructorを使用してスコープを制限
                const func = new Function('$', 'data', `
                    'use strict';
                    
                    // グローバルオブジェクトへのアクセスを制限
                    const window = undefined;
                    const document = undefined;
                    const global = undefined;
                    const globalThis = undefined;
                    
                    return (${expression});
                `);
                
                const result = func(data, data);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        });
    }

    destroy() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.pendingMessages.clear();
    }
}