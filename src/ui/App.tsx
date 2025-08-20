import { Box, Text, useApp } from 'ink';
import type React from 'react';
import { useEffect, useState } from 'react';
import { JsqProcessor } from '@/core/processor';
import type { JsqOptions } from '@/types/cli';
import { readStdin } from '@/utils/input';

interface AppProps {
  expression?: string | undefined;
  options: JsqOptions;
}

export const App: React.FC<AppProps> = ({ expression, options }) => {
  const { exit } = useApp();
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const processInput = async (): Promise<void> => {
      try {
        if (!expression) {
          setError('No expression provided. Use: jsq "expression" < input.json');
          setLoading(false);
          return;
        }

        const input = await readStdin();
        if (!input) {
          setError('No input data received from stdin');
          setLoading(false);
          return;
        }

        const processor = new JsqProcessor(options);
        const result = await processor.process(expression, input);

        setResult(JSON.stringify(result.data, null, 2));
        setLoading(false);

        // Exit after processing unless in watch mode
        if (!options.watch) {
          setTimeout(() => exit(), 100);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        setLoading(false);
        setTimeout(() => exit(1), 100);
      }
    };

    void processInput();
  }, [expression, options, exit]);

  if (loading) {
    return (
      <Box>
        <Text color="blue">Processing...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text>{result}</Text>
    </Box>
  );
};
