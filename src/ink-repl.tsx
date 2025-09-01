#!/usr/bin/env node

import React, { useState, useEffect, useCallback } from 'react';
import { render, Box, Text } from 'ink';
import { TextInput } from 'ink-ui';
import type { JsqOptions } from '@/types/cli';
import { JsqProcessor } from '@/core/lib/processor';
import { readFileByFormat, detectFileFormat } from '@/utils/file-input';
import { OutputFormatter } from '@/utils/output-formatter';

interface ReplState {
  data: unknown;
  history: string[];
  historyIndex: number;
  currentInput: string;
  result: string | null;
  error: string | null;
  processor: JsqProcessor;
  options: JsqOptions;
}

async function loadInitialData(options: JsqOptions): Promise<unknown> {
  if (options.file) {
    const format = await detectFileFormat(options.file, options.fileFormat);
    return await readFileByFormat(options.file, format);
  }
  return {};
}

const ReplApp: React.FC<{ initialData: unknown; options: JsqOptions }> = ({ initialData, options }) => {
  const [state, setState] = useState<ReplState>({
    data: initialData,
    history: [],
    historyIndex: -1,
    currentInput: '',
    result: null,
    error: null,
    processor: new JsqProcessor(options),
    options,
  });

  const evaluateExpression = useCallback(async (input: string) => {
    if (!input.trim()) {
      setState(prev => ({ ...prev, result: null, error: null }));
      return;
    }

    try {
      const result = await state.processor.process(input, JSON.stringify(state.data));
      const formatted = OutputFormatter.format(result.data, state.options);
      setState(prev => ({ ...prev, result: formatted, error: null }));
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        result: null, 
        error: err instanceof Error ? err.message : String(err) 
      }));
    }
  }, [state.processor, state.data, state.options]);

  const handleInputChange = useCallback((value: string) => {
    setState(prev => ({ ...prev, currentInput: value }));
    evaluateExpression(value);
  }, [evaluateExpression]);

  const handleSubmit = useCallback((value: string) => {
    if (value.trim()) {
      setState(prev => ({
        ...prev,
        history: [...prev.history, value],
        historyIndex: prev.history.length + 1,
        currentInput: ''
      }));
    }
  }, []);

  const handleKeyDown = useCallback((_input: string, key: any) => {
    if (key.upArrow && state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      const historicalValue = state.history[newIndex];
      setState(prev => ({
        ...prev,
        historyIndex: newIndex,
        currentInput: historicalValue
      }));
      evaluateExpression(historicalValue);
    } else if (key.downArrow) {
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1;
        const historicalValue = state.history[newIndex];
        setState(prev => ({
          ...prev,
          historyIndex: newIndex,
          currentInput: historicalValue
        }));
        evaluateExpression(historicalValue);
      } else if (state.historyIndex === state.history.length - 1) {
        setState(prev => ({
          ...prev,
          historyIndex: state.history.length,
          currentInput: ''
        }));
        evaluateExpression('');
      }
    }
  }, [state.history, state.historyIndex, evaluateExpression]);

  useEffect(() => {
    return () => {
      state.processor.dispose();
    };
  }, [state.processor]);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="yellow">jsq REPL - Press Ctrl+C to exit</Text>
      </Box>
      {options.file && (
        <Box marginBottom={1}>
          <Text>Loaded data from: {options.file}</Text>
        </Box>
      )}
      
      <Box marginBottom={1}>
        <Text>{'> '}</Text>
        <TextInput
          value={state.currentInput}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          onKeypress={handleKeyDown}
        />
      </Box>

      {state.result && (
        <Box>
          <Text color="green">{state.result}</Text>
        </Box>
      )}
      
      {state.error && (
        <Box>
          <Text color="red">Error: {state.error}</Text>
        </Box>
      )}
    </Box>
  );
};

async function startInkRepl() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const options: JsqOptions = {
    debug: args.includes('--debug'),
    verbose: args.includes('--verbose'),
    safe: args.includes('--safe'),
    color: true,
  };
  
  // Handle file option
  const fileIndex = args.indexOf('--file');
  if (fileIndex !== -1 && fileIndex < args.length - 1) {
    options.file = args[fileIndex + 1];
  }
  
  // Load initial data
  const initialData = await loadInitialData(options);
  
  // Render the app
  render(<ReplApp initialData={initialData} options={options} />);
}

// Start the REPL
startInkRepl().catch(error => {
  console.error('Failed to start REPL:', error);
  process.exit(1);
});