import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createRepl } from '@/core/repl/repl-factory';
import { ReplManager } from '@/core/repl/repl-manager';
import type { JsqOptions } from '@/types/cli';
import type { ApplicationContext } from '@/core/application-context';
import { Piscina } from 'piscina';

vi.mock('piscina');
vi.mock('@/utils/repl-file-communication');
vi.mock('@/core/repl/repl-manager');

describe('REPL Factory', () => {
  const mockContext: ApplicationContext = {
    supportedFeatures: new Set(['console.log', 'console.error']),
    runtimeVersion: 'test-version',
    verboseLog: vi.fn(),
    isVerbose: false,
  };
  
  const defaultOptions: JsqOptions = {
    expression: '',
    color: false,
    raw: false,
    compact: false,
    stream: false,
    keyDelimiter: '.',
    repl: true,
    realTimeEvaluation: false,
    replFileMode: false,
    verbose: false,
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('Worker Mode', () => {
    it('should create REPL with worker evaluator', async () => {
      const options: JsqOptions = {
        ...defaultOptions,
        replFileMode: false,
      };
      
      const mockPiscina = {
        run: vi.fn().mockResolvedValue({ result: 'test result' }),
        destroy: vi.fn(),
      };
      
      vi.mocked(Piscina).mockImplementation(() => mockPiscina as any);
      
      const repl = await createRepl(
        { test: 'data' },
        options,
        mockContext,
        { prompt: '> ', realTimeEvaluation: false }
      );
      
      expect(Piscina).toHaveBeenCalledWith({
        filename: expect.stringContaining('repl-worker.js'),
        maxThreads: 1,
        env: {
          JSQ_UNSAFE: 'false',
        },
      });
      
      expect(ReplManager).toHaveBeenCalledWith(
        { test: 'data' },
        options,
        expect.any(Function),
        { prompt: '> ', realTimeEvaluation: false }
      );
    });
    
    it('should handle worker evaluation errors', async () => {
      const options: JsqOptions = {
        ...defaultOptions,
        replFileMode: false,
      };
      
      const mockPiscina = {
        run: vi.fn().mockRejectedValue(new Error('Worker error')),
        destroy: vi.fn(),
      };
      
      vi.mocked(Piscina).mockImplementation(() => mockPiscina as any);
      
      const repl = await createRepl(
        { test: 'data' },
        options,
        mockContext,
        { prompt: '> ', realTimeEvaluation: false }
      );
      
      // Get the evaluator function that was passed to ReplManager
      const evaluatorCall = vi.mocked(ReplManager).mock.calls[0];
      const evaluator = evaluatorCall[2];
      
      const result = await evaluator('.test', { test: 'data' });
      
      expect(result).toEqual({ error: 'Worker error' });
    });
    
    it('should pass unsafe mode to worker environment', async () => {
      const options: JsqOptions = {
        ...defaultOptions,
        replFileMode: false,
        unsafe: true,
      };
      
      const mockPiscina = {
        run: vi.fn().mockResolvedValue({ result: 'test result' }),
        destroy: vi.fn(),
      };
      
      vi.mocked(Piscina).mockImplementation(() => mockPiscina as any);
      
      await createRepl(
        { test: 'data' },
        options,
        mockContext,
        { prompt: '> ', realTimeEvaluation: false }
      );
      
      expect(Piscina).toHaveBeenCalledWith({
        filename: expect.any(String),
        maxThreads: 1,
        env: {
          JSQ_UNSAFE: 'true',
        },
      });
    });
  });
  
  describe.skip('File Mode', () => {
    it('should create REPL with file mode evaluator', async () => {
      const FileCommunication = await import('@/utils/repl-file-communication');
      const mockFileCommunicator = {
        evaluate: vi.fn().mockResolvedValue({ result: 'file result' }),
        waitForReady: vi.fn().mockResolvedValue(undefined),
        close: vi.fn(),
      };
      
      vi.spyOn(FileCommunication, 'ReplFileCommunication').mockImplementation(
        () => mockFileCommunicator as any
      );
      
      const options: JsqOptions = {
        ...defaultOptions,
        replFileMode: true,
      };
      
      const repl = await createRepl(
        { test: 'data' },
        options,
        mockContext,
        { prompt: '> ', realTimeEvaluation: false }
      );
      
      expect(FileCommunication.ReplFileCommunication).toHaveBeenCalled();
      expect(mockFileCommunicator.waitForReady).toHaveBeenCalled();
      
      // Test the evaluator
      const evaluatorCall = vi.mocked(ReplManager).mock.calls[0];
      const evaluator = evaluatorCall[2];
      
      const result = await evaluator('.test', { test: 'data' });
      
      expect(mockFileCommunicator.evaluate).toHaveBeenCalledWith(
        '.test',
        { test: 'data' },
        expect.any(Object)
      );
      expect(result).toEqual({ result: 'file result' });
    });
    
    it('should handle file mode initialization errors', async () => {
      const FileCommunication = await import('@/utils/repl-file-communication');
      const mockFileCommunicator = {
        waitForReady: vi.fn().mockRejectedValue(new Error('Init failed')),
        close: vi.fn(),
      };
      
      vi.spyOn(FileCommunication, 'ReplFileCommunication').mockImplementation(
        () => mockFileCommunicator as any
      );
      
      const options: JsqOptions = {
        ...defaultOptions,
        replFileMode: true,
      };
      
      await expect(createRepl(
        { test: 'data' },
        options,
        mockContext,
        { prompt: '> ', realTimeEvaluation: false }
      )).rejects.toThrow('Init failed');
    });
    
    it('should handle file mode evaluation errors', async () => {
      const FileCommunication = await import('@/utils/repl-file-communication');
      const mockFileCommunicator = {
        evaluate: vi.fn().mockRejectedValue(new Error('Evaluation failed')),
        waitForReady: vi.fn().mockResolvedValue(undefined),
        close: vi.fn(),
      };
      
      vi.spyOn(FileCommunication, 'ReplFileCommunication').mockImplementation(
        () => mockFileCommunicator as any
      );
      
      const options: JsqOptions = {
        ...defaultOptions,
        replFileMode: true,
      };
      
      const repl = await createRepl(
        { test: 'data' },
        options,
        mockContext,
        { prompt: '> ', realTimeEvaluation: false }
      );
      
      // Get the evaluator
      const evaluatorCall = vi.mocked(ReplManager).mock.calls[0];
      const evaluator = evaluatorCall[2];
      
      const result = await evaluator('.test', { test: 'data' });
      
      expect(result).toEqual({ error: 'Evaluation failed' });
    });
  });
  
  describe('REPL Options', () => {
    it('should pass real-time evaluation option correctly', async () => {
      const options: JsqOptions = {
        ...defaultOptions,
        realTimeEvaluation: true,
      };
      
      const mockPiscina = {
        run: vi.fn().mockResolvedValue({ result: 'test' }),
        destroy: vi.fn(),
      };
      
      vi.mocked(Piscina).mockImplementation(() => mockPiscina as any);
      
      await createRepl(
        { test: 'data' },
        options,
        mockContext,
        { prompt: '$ ', realTimeEvaluation: true }
      );
      
      expect(ReplManager).toHaveBeenCalledWith(
        { test: 'data' },
        options,
        expect.any(Function),
        { prompt: '$ ', realTimeEvaluation: true }
      );
    });
    
    it('should use default options when not provided', async () => {
      const mockPiscina = {
        run: vi.fn().mockResolvedValue({ result: 'test' }),
        destroy: vi.fn(),
      };
      
      vi.mocked(Piscina).mockImplementation(() => mockPiscina as any);
      
      await createRepl(
        { test: 'data' },
        defaultOptions,
        mockContext
      );
      
      expect(ReplManager).toHaveBeenCalledWith(
        { test: 'data' },
        defaultOptions,
        expect.any(Function),
        { prompt: '> ', realTimeEvaluation: false }
      );
    });
    
    it('should handle custom IO providers', async () => {
      const mockInput = { on: vi.fn(), removeListener: vi.fn() };
      const mockOutput = { write: vi.fn() };
      
      const mockPiscina = {
        run: vi.fn().mockResolvedValue({ result: 'test' }),
        destroy: vi.fn(),
      };
      
      vi.mocked(Piscina).mockImplementation(() => mockPiscina as any);
      
      await createRepl(
        { test: 'data' },
        defaultOptions,
        mockContext,
        {
          prompt: '>>> ',
          realTimeEvaluation: false,
          io: {
            input: mockInput as any,
            output: mockOutput as any,
          },
        }
      );
      
      expect(ReplManager).toHaveBeenCalledWith(
        { test: 'data' },
        defaultOptions,
        expect.any(Function),
        {
          prompt: '>>> ',
          realTimeEvaluation: false,
          io: {
            input: mockInput,
            output: mockOutput,
          },
        }
      );
    });
  });
  
  describe('Evaluation Handler', () => {
    it('should handle complex data serialization', async () => {
      const options: JsqOptions = {
        ...defaultOptions,
        replFileMode: false,
      };
      
      const complexData = {
        date: new Date('2023-01-01'),
        regexp: /test/gi,
        func: () => 'test',
        circular: null as any,
      };
      complexData.circular = complexData;
      
      const mockPiscina = {
        run: vi.fn().mockImplementation(({ data }) => {
          // Verify that data is properly stringified
          expect(typeof data).toBe('string');
          const parsed = JSON.parse(data);
          expect(parsed.date).toBe('2023-01-01T00:00:00.000Z');
          return Promise.resolve({ result: 'ok' });
        }),
        destroy: vi.fn(),
      };
      
      vi.mocked(Piscina).mockImplementation(() => mockPiscina as any);
      
      const repl = await createRepl(
        { test: 'data' },
        options,
        mockContext,
        { prompt: '> ', realTimeEvaluation: false }
      );
      
      const evaluatorCall = vi.mocked(ReplManager).mock.calls[0];
      const evaluator = evaluatorCall[2];
      
      // This should handle circular reference gracefully
      const result = await evaluator('.test', complexData);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('circular');
    });
    
    it('should preserve string data without double serialization', async () => {
      const options: JsqOptions = {
        ...defaultOptions,
        replFileMode: false,
      };
      
      const mockPiscina = {
        run: vi.fn().mockImplementation(({ data }) => {
          expect(data).toBe('{"key":"value"}');
          return Promise.resolve({ result: 'ok' });
        }),
        destroy: vi.fn(),
      };
      
      vi.mocked(Piscina).mockImplementation(() => mockPiscina as any);
      
      const repl = await createRepl(
        { test: 'data' },
        options,
        mockContext,
        { prompt: '> ', realTimeEvaluation: false }
      );
      
      const evaluatorCall = vi.mocked(ReplManager).mock.calls[0];
      const evaluator = evaluatorCall[2];
      
      await evaluator('.test', '{"key":"value"}');
      
      expect(mockPiscina.run).toHaveBeenCalledWith({
        expression: '.test',
        data: '{"key":"value"}',
        options: undefined,
        context: mockContext,
      });
    });
  });
});