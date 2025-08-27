import React, { useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { WebSandbox } from './sandbox/WebSandbox';
import { JsonFormatter } from './components/JsonFormatter';

type OutputFormat = 'json' | 'pretty' | 'raw' | 'yaml' | 'csv' | 'tsv';

const App: React.FC = () => {
    const [jsonInput, setJsonInput] = useState<string>('{\n  "users": [\n    {"id": 1, "name": "Alice", "age": 25},\n    {"id": 2, "name": "Bob", "age": 30},\n    {"id": 3, "name": "Charlie", "age": 35}\n  ]\n}');
    const [expression, setExpression] = useState<string>('$.users.filter(u => u.age > 25)');
    const [result, setResult] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [outputFormat, setOutputFormat] = useState<OutputFormat>('pretty');
    const [executionTime, setExecutionTime] = useState<number | null>(null);

    const sandbox = React.useRef(new WebSandbox()).current;

    const handleRunExpression = useCallback(async () => {
        setLoading(true);
        setError('');
        setResult('');
        setExecutionTime(null);

        const startTime = performance.now();

        try {
            // JSONをパース
            let data;
            try {
                data = JSON.parse(jsonInput);
            } catch (e) {
                throw new Error(`Invalid JSON: ${e.message}`);
            }

            // サンドボックスで式を実行
            const output = await sandbox.evaluate(expression, data);
            
            const endTime = performance.now();
            setExecutionTime(endTime - startTime);

            // 結果をフォーマット
            let formattedResult: string;
            switch (outputFormat) {
                case 'pretty':
                    formattedResult = JSON.stringify(output, null, 2);
                    break;
                case 'json':
                    formattedResult = JSON.stringify(output);
                    break;
                case 'raw':
                    formattedResult = String(output);
                    break;
                case 'yaml':
                    // 簡易的なYAML変換（実際にはjs-yamlライブラリを使うべき）
                    formattedResult = convertToYaml(output);
                    break;
                case 'csv':
                case 'tsv':
                    formattedResult = convertToDelimited(output, outputFormat === 'tsv' ? '\t' : ',');
                    break;
                default:
                    formattedResult = JSON.stringify(output, null, 2);
            }

            setResult(formattedResult);
        } catch (err) {
            setError(err.message || 'Unknown error occurred');
        } finally {
            setLoading(false);
        }
    }, [jsonInput, expression, outputFormat, sandbox]);

    return (
        <div className="container">
            <div className="header">
                <h1>JSQ Web</h1>
                <p>JavaScript-Powered JSON Query Tool</p>
            </div>

            <div className="editor-container">
                <div className="editor-panel">
                    <div className="editor-header">Input JSON</div>
                    <div className="editor-content">
                        <textarea
                            className="editor"
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            placeholder="Enter your JSON data here..."
                            spellCheck={false}
                        />
                    </div>
                </div>

                <div className="editor-panel">
                    <div className="editor-header">Output</div>
                    <div className="editor-content">
                        {loading && <div className="loading">Processing...</div>}
                        {error && <div className="error-message">Error: {error}</div>}
                        {result && (
                            <>
                                <JsonFormatter content={result} />
                                {executionTime !== null && (
                                    <div className="result-stats">
                                        Execution time: {executionTime.toFixed(2)}ms
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="expression-panel">
                <div className="expression-input-container">
                    <input
                        className="expression-input"
                        type="text"
                        value={expression}
                        onChange={(e) => setExpression(e.target.value)}
                        placeholder="Enter JavaScript expression (e.g., $.users.filter(u => u.age > 25))"
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleRunExpression();
                            }
                        }}
                    />
                    <button className="run-button" onClick={handleRunExpression} disabled={loading}>
                        Run
                    </button>
                </div>

                <div className="options">
                    <div className="option-group">
                        <label htmlFor="output-format">Output Format:</label>
                        <select
                            id="output-format"
                            value={outputFormat}
                            onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                        >
                            <option value="pretty">Pretty JSON</option>
                            <option value="json">Compact JSON</option>
                            <option value="raw">Raw</option>
                            <option value="yaml">YAML</option>
                            <option value="csv">CSV</option>
                            <option value="tsv">TSV</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 簡易的なYAML変換関数
function convertToYaml(obj: any, indent: number = 0): string {
    const spaces = ' '.repeat(indent);
    
    if (obj === null) return 'null';
    if (typeof obj !== 'object') return String(obj);
    
    if (Array.isArray(obj)) {
        return obj.map(item => `${spaces}- ${convertToYaml(item, indent + 2)}`).join('\n');
    }
    
    return Object.entries(obj)
        .map(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
                return `${spaces}${key}:\n${convertToYaml(value, indent + 2)}`;
            }
            return `${spaces}${key}: ${convertToYaml(value, indent)}`;
        })
        .join('\n');
}

// 簡易的なCSV/TSV変換関数
function convertToDelimited(obj: any, delimiter: string): string {
    if (!Array.isArray(obj)) {
        return JSON.stringify(obj);
    }
    
    if (obj.length === 0) return '';
    
    // オブジェクトの配列の場合
    if (typeof obj[0] === 'object' && obj[0] !== null) {
        const headers = Object.keys(obj[0]);
        const headerRow = headers.join(delimiter);
        const dataRows = obj.map(item => 
            headers.map(header => JSON.stringify(item[header] ?? '')).join(delimiter)
        );
        return [headerRow, ...dataRows].join('\n');
    }
    
    // プリミティブの配列の場合
    return obj.map(item => JSON.stringify(item)).join('\n');
}

// アプリケーションのマウント
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}