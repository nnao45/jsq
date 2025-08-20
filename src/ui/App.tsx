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
        const validationError = validateInputs(expression);
        if (validationError) {
          handleValidationError(validationError, setError, setLoading);
          return;
        }

        let input: string;
        try {
          input = await readStdin();
        } catch {
          // If no input is available, use null as default
          input = 'null';
        }
        if (!input) {
          input = 'null';
        }

        await processExpression(expression, input, options, setResult, setLoading, exit);
      } catch (err) {
        handleProcessingError(err, setError, setLoading, exit);
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

function validateInputs(expression: string): string | null {
  if (!expression) {
    return 'No expression provided. Use: jsq "expression" < input.json';
  }
  return null;
}

function handleValidationError(
  error: string,
  setError: (error: string) => void,
  setLoading: (loading: boolean) => void
): void {
  setError(error);
  setLoading(false);
}

async function processExpression(
  expression: string,
  input: string,
  options: JsqOptions,
  setResult: (result: string) => void,
  setLoading: (loading: boolean) => void,
  exit: (code?: number) => void
): Promise<void> {
  const processor = new JsqProcessor(options);
  const result = await processor.process(expression, input);

  setResult(JSON.stringify(result.data, null, 2));
  setLoading(false);

  // Exit after processing unless in watch mode
  if (!options.watch) {
    setTimeout(() => exit(), 100);
  }
}

function handleProcessingError(
  err: unknown,
  setError: (error: string) => void,
  setLoading: (loading: boolean) => void,
  exit: (code?: number) => void
): void {
  const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
  setError(errorMessage);
  setLoading(false);
  setTimeout(() => exit(1), 100);
}
