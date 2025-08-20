import { Box, Text, useApp, useInput } from 'ink';
import { useCallback, useEffect, useState } from 'react';
import { JsqProcessor } from '../core/processor';
import type { JsqOptions } from '../types/cli';

interface REPLAppProps {
  initialData?: string;
  options: JsqOptions;
}

interface HistoryItem {
  expression: string;
  result: string;
  error?: string;
  timestamp: Date;
}

export function REPLApp({ initialData = '{}', options }: REPLAppProps) {
  const { exit } = useApp();
  const [processor] = useState(() => new JsqProcessor(options));
  const [currentExpression, setCurrentExpression] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [data, _setData] = useState(initialData);
  const [status, setStatus] = useState<'ready' | 'processing' | 'error'>('ready');

  const processExpression = useCallback(
    async (expression: string) => {
      if (!expression.trim()) return;

      setStatus('processing');
      const timestamp = new Date();

      try {
        const result = await processor.process(expression, data);
        let resultStr: string;

        if (typeof result.data === 'string') {
          resultStr = JSON.stringify(result.data);
        } else {
          resultStr = JSON.stringify(result.data, null, 2);
        }

        setHistory(prev => [
          ...prev,
          {
            expression,
            result: resultStr,
            timestamp,
          },
        ]);
        setStatus('ready');

        // Auto-scroll to bottom after processing
        setTimeout(() => setStatus('ready'), 100);
      } catch (error) {
        const errorStr = error instanceof Error ? error.message : 'Unknown error';
        setHistory(prev => [
          ...prev,
          {
            expression,
            result: '',
            error: errorStr,
            timestamp,
          },
        ]);
        setStatus('ready');
      }
    },
    [processor, data]
  );

  const handleKeyInput = useCallback(
    (
      input: string,
      key: {
        return?: boolean;
        ctrl?: boolean;
        meta?: boolean;
        backspace?: boolean;
      }
    ) => {
      if (key.return && currentExpression.trim()) {
        processExpression(currentExpression);
        setCurrentExpression('');
        return;
      }

      if (key.ctrl && input) {
        handleCtrlInput(input);
        return;
      }

      if (key.backspace) {
        setCurrentExpression(prev => prev.slice(0, -1));
        return;
      }

      if (!key.ctrl && !key.meta && input) {
        setCurrentExpression(prev => prev + input);
      }
    },
    [currentExpression, processExpression]
  );

  const handleCtrlInput = useCallback(
    (input: string) => {
      switch (input) {
        case 'c':
        case 'd':
          exit();
          break;
        case 'l':
          setHistory([]);
          break;
        case 'u':
          setCurrentExpression('');
          break;
      }
    },
    [exit]
  );

  useInput(handleKeyInput);

  useEffect(() => {
    return () => {
      processor.dispose();
    };
  }, [processor]);

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'yellow';
      case 'error':
        return 'red';
      default:
        return 'green';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'processing':
        return 'Processing...';
      case 'error':
        return 'Error';
      default:
        return 'Ready';
    }
  };

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          jsq REPL - jQuery-style JSON processor
        </Text>
      </Box>

      {/* Data preview */}
      <Box marginBottom={1} borderStyle="single" paddingX={1}>
        <Box flexDirection="column">
          <Text color="gray">Data:</Text>
          <Text>{data.length > 200 ? `${data.slice(0, 200)}...` : data}</Text>
        </Box>
      </Box>

      {/* History */}
      <Box flexDirection="column" flexGrow={1} marginBottom={1}>
        {history.slice(-5).map((item, index) => (
          <Box key={`${item.timestamp.getTime()}-${index}`} flexDirection="column" marginBottom={1}>
            <Box>
              <Text color="blue" bold>
                jsq&gt;{' '}
              </Text>
              <Text>{item.expression}</Text>
            </Box>
            {item.error ? (
              <Text color="red">Error: {item.error}</Text>
            ) : (
              <Box marginLeft={6}>
                <Text color="green">{item.result}</Text>
              </Box>
            )}
          </Box>
        ))}
      </Box>

      {/* Status line */}
      <Box marginBottom={1}>
        <Text color={getStatusColor()}>
          [{getStatusText()}] {options.safe ? '🔒 Safe' : '⚡ Fast'} mode
        </Text>
      </Box>

      {/* Input line */}
      <Box>
        <Text color="blue" bold>
          jsq&gt;{' '}
        </Text>
        <Text>{currentExpression}</Text>
        <Text color={status === 'processing' ? 'yellow' : 'gray'}>
          {status === 'processing' ? '⏳' : '█'}
        </Text>
      </Box>

      {/* Help footer */}
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Ctrl+C/D: exit | Ctrl+L: clear history | Ctrl+U: clear input
        </Text>
      </Box>
    </Box>
  );
}
