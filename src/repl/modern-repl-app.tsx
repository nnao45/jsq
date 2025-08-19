import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Box, Text, useInput, useApp, Spacer, useStdout } from 'ink';
import { JsqProcessor } from '../core/processor';
import { JsqOptions } from '../types/cli';
import { SyntaxChecker } from './syntax-checker';

interface REPLAppProps {
  initialData?: string;
  options: JsqOptions;
}

interface EvaluationResult {
  result?: string;
  error?: string;
  isPartial?: boolean;
}

const DEBOUNCE_MS = 300;

// Available colors for the prompt
const PROMPT_COLORS = [
  'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
  'redBright', 'greenBright', 'yellowBright', 'blueBright', 
  'magentaBright', 'cyanBright', 'whiteBright'
] as const;

type PromptColor = typeof PROMPT_COLORS[number];

// Memoized prompt component to reduce re-renders
const PromptSection = memo(({ 
  promptColors, 
  currentExpression, 
  cursorPosition, 
  isEvaluating,
  showSlowLoading 
}: {
  promptColors: [PromptColor, PromptColor, PromptColor];
  currentExpression: string;
  cursorPosition: number;
  isEvaluating: boolean;
  showSlowLoading: boolean;
}) => (
  <Box borderStyle="single" borderColor="white" padding={1}>
    <Box flexDirection="column" width="100%">
      <Text color="white" bold>
        {isEvaluating && showSlowLoading ? "⏳" : "🚀"} Expression
      </Text>
      <Box marginTop={1}>
        <Text color={promptColors[0]}>❯</Text>
        <Text color={promptColors[1]}>❯</Text>
        <Text color={promptColors[2]}>❯ </Text>
        <Text>
          {currentExpression.slice(0, cursorPosition)}
          <Text backgroundColor="white" color="black">
            {currentExpression[cursorPosition] || ' '}
          </Text>
          {currentExpression.slice(cursorPosition + 1)}
        </Text>
      </Box>
    </Box>
  </Box>
));

export function ModernREPLApp({ initialData = '{}', options }: REPLAppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [processor] = useState(() => new JsqProcessor(options));
  const [currentExpression, setCurrentExpression] = useState('');
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult>({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showSlowLoading, setShowSlowLoading] = useState(false);
  const [data] = useState(initialData);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showData, setShowData] = useState(false);
  const [promptColors, setPromptColors] = useState<[PromptColor, PromptColor, PromptColor]>(() => {
    // Initialize with random colors for each character
    return [
      PROMPT_COLORS[Math.floor(Math.random() * PROMPT_COLORS.length)],
      PROMPT_COLORS[Math.floor(Math.random() * PROMPT_COLORS.length)],
      PROMPT_COLORS[Math.floor(Math.random() * PROMPT_COLORS.length)]
    ];
  });

  // Helper function to change colors for each character every second
  const changePromptColors = useCallback(() => {
    setPromptColors(() => {
      return [
        PROMPT_COLORS[Math.floor(Math.random() * PROMPT_COLORS.length)],
        PROMPT_COLORS[Math.floor(Math.random() * PROMPT_COLORS.length)],
        PROMPT_COLORS[Math.floor(Math.random() * PROMPT_COLORS.length)]
      ];
    });
  }, []);

  // Set up 1-second interval for color changes
  useEffect(() => {
    const interval = setInterval(() => {
      changePromptColors();
    }, 1000);

    return () => clearInterval(interval);
  }, [changePromptColors]);

  // Debounced evaluation function
  const debouncedEvaluate = useCallback(
    debounce(async (expression: string) => {
      if (!expression.trim()) {
        setEvaluationResult({});
        return;
      }

      setIsEvaluating(true);
      setShowSlowLoading(false);
      
      // Set a timer to show slow loading indicator after 500ms
      const slowLoadingTimer = setTimeout(() => {
        setShowSlowLoading(true);
      }, 500);
      
      try {
        const result = await processor.process(expression, data);
        
        // Clear the timer since evaluation completed
        clearTimeout(slowLoadingTimer);
        let resultStr: string;
        
        if (typeof result.data === 'string') {
          resultStr = JSON.stringify(result.data);
        } else {
          resultStr = JSON.stringify(result.data, null, 2);
        }
        
        setEvaluationResult({ result: resultStr });
      } catch (error) {
        // Clear the timer on error as well
        clearTimeout(slowLoadingTimer);
        const errorStr = error instanceof Error ? error.message : 'Syntax error';
        // Use syntax checker to determine if expression is partial
        const isPartial = SyntaxChecker.isLikelyPartial(expression);
                         
        setEvaluationResult({ 
          error: errorStr,
          isPartial 
        });
      } finally {
        clearTimeout(slowLoadingTimer);
        setIsEvaluating(false);
        setShowSlowLoading(false);
      }
    }, DEBOUNCE_MS),
    [processor, data]
  );

  // Trigger evaluation when expression changes
  useEffect(() => {
    debouncedEvaluate(currentExpression);
    // Update suggestions
    const newSuggestions = SyntaxChecker.getSuggestions(currentExpression);
    setSuggestions(newSuggestions);
    // Ensure cursor position is within bounds
    setCursorPosition(prev => Math.min(prev, currentExpression.length));
  }, [currentExpression, debouncedEvaluate]);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
    } else if (key.ctrl && input === 'd') {
      exit();
    } else if (key.ctrl && input === 'r') {
      setShowData(prev => !prev);
    } else if (key.delete) {
      // This is actually backspace! Move cursor left and delete character
      if (cursorPosition > 0) {
        const newPos = cursorPosition - 1;
        // Delete character at new position
        setCurrentExpression(prev => {
          return prev.slice(0, newPos) + prev.slice(cursorPosition);
        });
        // Move cursor left
        setCursorPosition(newPos);
      }
    } else if (key.leftArrow) {
      setCursorPosition(prev => Math.max(0, prev - 1));
    } else if (key.rightArrow) {
      setCursorPosition(prev => Math.min(currentExpression.length, prev + 1));
    } else if (key.ctrl && input === 'a') {
      setCursorPosition(0);
    } else if (key.ctrl && input === 'e') {
      setCursorPosition(currentExpression.length);
    } else if (key.ctrl && input === 'l') {
      setCurrentExpression('');
      setCursorPosition(0);
      setEvaluationResult({});
    } else if (!key.ctrl && !key.meta && input) {
      const newCursorPos = cursorPosition + 1;
      setCurrentExpression(prev => {
        return prev.slice(0, cursorPosition) + input + prev.slice(cursorPosition);
      });
      setCursorPosition(newCursorPos);
    }
  });

  useEffect(() => {
    return () => {
      processor.dispose();
    };
  }, [processor]);

  // Format data preview - limit to ~200 chars
  const dataPreview = useMemo(() => {
    try {
      const parsed = JSON.parse(data);
      const preview = JSON.stringify(parsed, null, 2);
      return preview.length > 200 ? `${preview.slice(0, 200)}...` : preview;
    } catch {
      return data.length > 200 ? `${data.slice(0, 200)}...` : data;
    }
  }, [data]);

  // Truncate result to prevent overflow
  const truncateResult = (result: string, maxLines: number = outputHeight - 4): string => {
    const lines = result.split('\n');
    if (lines.length <= maxLines) {
      return result;
    }
    
    const truncatedLines = lines.slice(0, maxLines - 1);
    truncatedLines.push(`... (${lines.length - maxLines + 1} more lines truncated)`);
    return truncatedLines.join('\n');
  };

  const getResultDisplay = () => {
    if (isEvaluating) {
      if (showSlowLoading) {
        return <Text color="yellow">⏳ Evaluating... (taking longer than usual)</Text>;
      } else {
        return null; // No indicator for fast processing
      }
    }
    
    if (evaluationResult.error) {
      if (evaluationResult.isPartial) {
        if (suggestions.length > 0) {
          return (
            <Box flexDirection="column">
              <Text color="gray" dimColor>Continue typing...</Text>
              <Text color="blue" dimColor>💡 Suggestions: {suggestions.slice(0, 3).join(', ')}</Text>
            </Box>
          );
        }
        return <Text color="gray" dimColor>Continue typing...</Text>;
      }
      return <Text color="red">❌ {evaluationResult.error}</Text>;
    }
    
    if (evaluationResult.result !== undefined) {
      const truncatedResult = truncateResult(evaluationResult.result);
      return <Text color="green">✓ {truncatedResult}</Text>;
    }
    
    if (suggestions.length > 0) {
      return (
        <Box flexDirection="column">
          <Text color="gray" dimColor>Type a jsq expression...</Text>
          <Text color="blue" dimColor>💡 Try: {suggestions.slice(0, 3).join(', ')}</Text>
        </Box>
      );
    }
    
    return <Text color="gray" dimColor>Type a jsq expression...</Text>;
  };

  const getStatusColor = () => {
    if (isEvaluating && showSlowLoading) return 'yellow';
    if (evaluationResult.error && !evaluationResult.isPartial) return 'red';
    if (evaluationResult.result !== undefined) return 'green';
    return 'blue';
  };

  // Get terminal height and reserve space for prompt
  const terminalHeight = stdout.rows || 24;
  const promptHeight = 5; // Approximate height of prompt section (including data status)
  const outputHeight = Math.max(terminalHeight - promptHeight - 2, 10);

  return (
    <Box flexDirection="column" height={terminalHeight}>
      {/* Output Area - Fixed height to prevent scrolling */}
      <Box flexDirection="column" height={outputHeight}>
        {/* Data Section - Only show if toggled */}
        {showData && (
          <Box borderStyle="single" borderColor="blue" padding={1} marginBottom={1}>
            <Box flexDirection="column" width="100%">
              <Text color="blue" bold>📊 Data</Text>
              <Box marginTop={1}>
                <Text wrap="wrap">{dataPreview}</Text>
              </Box>
            </Box>
          </Box>
        )}

        {/* Result Section */}
        <Box padding={1} flexGrow={1}>
          <Box flexDirection="column" width="100%">
            <Text color="green" bold>💎 Result</Text>
            <Box marginTop={1}>
              {getResultDisplay()}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Expression Input - Fixed at bottom */}
      <PromptSection
        promptColors={promptColors}
        currentExpression={currentExpression}
        cursorPosition={cursorPosition}
        isEvaluating={isEvaluating}
        showSlowLoading={showSlowLoading}
      />
      
      {/* Data hint below frame */}
      <Box paddingLeft={1}>
        <Text color="gray" dimColor>
          {showData ? 'Ctrl+R to hide data' : 'Ctrl+R to show data'}
        </Text>
      </Box>
    </Box>
  );
}

// Utility debounce function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
}