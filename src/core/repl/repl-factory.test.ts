import { Worker } from 'node:worker_threads';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApplicationContext } from '@/core/application-context';
import { createRepl } from '@/core/repl/repl-factory';
import { ReplManager } from '@/core/repl/repl-manager';
import type { JsqOptions } from '@/types/cli';

vi.mock('node:worker_threads');
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
    it('should create REPL with worker evaluator', { timeout: 5000 }, async () => {
      const options: JsqOptions = {
        ...defaultOptions,
        replFileMode: false,
      };

      const mockWorker = {
        on: vi.fn(),
        once: vi.fn(),
        off: vi.fn(),
        removeListener: vi.fn(),
        postMessage: vi.fn(),
        terminate: vi.fn().mockResolvedValue(undefined),
      };

      // Setup worker to emit ready message
      mockWorker.on.mockImplementation((event: string, handler: (value: any) => void) => {
        if (event === 'message') {
          // Simulate ready message
          setTimeout(() => handler({ type: 'ready' }), 0);
        }
      });

      vi.mocked(Worker).mockImplementation(() => mockWorker as any);

      const _repl = await createRepl({ test: 'data' }, options, mockContext, {
        prompt: '> ',
        realTimeEvaluation: false,
      });

      expect(Worker).toHaveBeenCalledWith(expect.stringContaining('repl-worker.js'), {
        env: {
          JSQ_UNSAFE: 'false',
        },
      });

      expect(ReplManager).toHaveBeenCalledWith({ test: 'data' }, options, expect.any(Function), {
        prompt: '> ',
        realTimeEvaluation: false,
      });
    });

    it('should handle worker evaluation errors', async () => {
      const options: JsqOptions = {
        ...defaultOptions,
        replFileMode: false,
      };

      const mockWorker = {
        on: vi.fn(),
        once: vi.fn(),
        removeListener: vi.fn(),
        postMessage: vi.fn(),
        terminate: vi.fn().mockResolvedValue(undefined),
      };

      // Setup worker to emit ready message first, then error on evaluation
      mockWorker.on.mockImplementation((event: string, handler: (value: any) => void) => {
        if (event === 'message') {
          // Simulate ready message
          setTimeout(() => handler({ type: 'ready' }), 0);
        } else if (event === 'error') {
          // Error handler setup
        }
      });

      mockWorker.once.mockImplementation((event: string, handler: (value: any) => void) => {
        if (event === 'message') {
          mockWorker.postMessage.mockImplementationOnce(() => {
            // Simulate error response
            setTimeout(() => handler({ type: 'result', errors: [{ message: 'Worker error' }] }), 0);
          });
        } else if (event === 'error') {
          // Store error handler but don't call it
        }
      });

      vi.mocked(Worker).mockImplementation(() => mockWorker as any);

      const _repl = await createRepl({ test: 'data' }, options, mockContext, {
        prompt: '> ',
        realTimeEvaluation: false,
      });

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

      const mockWorker = {
        on: vi.fn(),
        once: vi.fn(),
        removeListener: vi.fn(),
        postMessage: vi.fn(),
        terminate: vi.fn().mockResolvedValue(undefined),
      };

      // Setup worker to emit ready message
      mockWorker.on.mockImplementation((event: string, handler: (value: any) => void) => {
        if (event === 'message') {
          // Simulate ready message
          setTimeout(() => handler({ type: 'ready' }), 0);
        }
      });

      vi.mocked(Worker).mockImplementation(() => mockWorker as any);

      await createRepl({ test: 'data' }, options, mockContext, {
        prompt: '> ',
        realTimeEvaluation: false,
      });

      expect(Worker).toHaveBeenCalledWith(expect.stringContaining('repl-worker.js'), {
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

      const _repl = await createRepl({ test: 'data' }, options, mockContext, {
        prompt: '> ',
        realTimeEvaluation: false,
      });

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

      await expect(
        createRepl({ test: 'data' }, options, mockContext, {
          prompt: '> ',
          realTimeEvaluation: false,
        })
      ).rejects.toThrow('Init failed');
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

      const _repl = await createRepl({ test: 'data' }, options, mockContext, {
        prompt: '> ',
        realTimeEvaluation: false,
      });

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

      const mockWorker = {
        on: vi.fn(),
        once: vi.fn(),
        removeListener: vi.fn(),
        postMessage: vi.fn(),
        terminate: vi.fn().mockResolvedValue(undefined),
      };

      // Setup worker to emit ready message
      mockWorker.on.mockImplementation((event: string, handler: (value: any) => void) => {
        if (event === 'message') {
          // Simulate ready message
          setTimeout(() => handler({ type: 'ready' }), 0);
        }
      });

      vi.mocked(Worker).mockImplementation(() => mockWorker as any);

      await createRepl({ test: 'data' }, options, mockContext, {
        prompt: '$ ',
        realTimeEvaluation: true,
      });

      expect(ReplManager).toHaveBeenCalledWith({ test: 'data' }, options, expect.any(Function), {
        prompt: '$ ',
        realTimeEvaluation: true,
      });
    });

    it('should use default options when not provided', async () => {
      const mockWorker = {
        on: vi.fn(),
        once: vi.fn(),
        removeListener: vi.fn(),
        postMessage: vi.fn(),
        terminate: vi.fn().mockResolvedValue(undefined),
      };

      // Setup worker to emit ready message
      mockWorker.on.mockImplementation((event: string, handler: (value: any) => void) => {
        if (event === 'message') {
          // Simulate ready message
          setTimeout(() => handler({ type: 'ready' }), 0);
        }
      });

      vi.mocked(Worker).mockImplementation(() => mockWorker as any);

      await createRepl({ test: 'data' }, defaultOptions, mockContext);

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

      const mockWorker = {
        on: vi.fn(),
        once: vi.fn(),
        removeListener: vi.fn(),
        postMessage: vi.fn(),
        terminate: vi.fn().mockResolvedValue(undefined),
      };

      // Setup worker to emit ready message
      mockWorker.on.mockImplementation((event: string, handler: (value: any) => void) => {
        if (event === 'message') {
          // Simulate ready message
          setTimeout(() => handler({ type: 'ready' }), 0);
        }
      });

      vi.mocked(Worker).mockImplementation(() => mockWorker as any);

      await createRepl({ test: 'data' }, defaultOptions, mockContext, {
        prompt: '>>> ',
        realTimeEvaluation: false,
        io: {
          input: mockInput as any,
          output: mockOutput as any,
        },
      });

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

      const mockWorker = {
        on: vi.fn(),
        once: vi.fn(),
        removeListener: vi.fn(),
        postMessage: vi.fn(),
        terminate: vi.fn().mockResolvedValue(undefined),
      };

      // Setup worker to emit ready message first
      mockWorker.on.mockImplementation((event: string, handler: (value: any) => void) => {
        if (event === 'message') {
          // Simulate ready message
          setTimeout(() => handler({ type: 'ready' }), 0);
        }
      });

      mockWorker.once.mockImplementation((event: string, handler: (value: any) => void) => {
        if (event === 'message') {
          mockWorker.postMessage.mockImplementationOnce(() => {
            // Circular reference will cause JSON.stringify error
            // Simulate error response
            setTimeout(
              () =>
                handler({
                  type: 'result',
                  errors: [{ message: 'Converting circular structure to JSON' }],
                }),
              0
            );
          });
        }
      });

      vi.mocked(Worker).mockImplementation(() => mockWorker as any);

      const _repl = await createRepl({ test: 'data' }, options, mockContext, {
        prompt: '> ',
        realTimeEvaluation: false,
      });

      const evaluatorCall = vi.mocked(ReplManager).mock.calls[0];
      const evaluator = evaluatorCall[2];

      // This should handle circular reference gracefully
      const result = await evaluator('.test', complexData, options);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('circular');
    });

    it('should preserve string data without double serialization', async () => {
      const options: JsqOptions = {
        ...defaultOptions,
        replFileMode: false,
      };

      const mockWorker = {
        on: vi.fn(),
        once: vi.fn(),
        removeListener: vi.fn(),
        postMessage: vi.fn(),
        terminate: vi.fn().mockResolvedValue(undefined),
      };

      // Setup worker to emit ready message first
      mockWorker.on.mockImplementation((event: string, handler: (value: any) => void) => {
        if (event === 'message') {
          // Simulate ready message
          setTimeout(() => handler({ type: 'ready' }), 0);
        }
      });

      mockWorker.once.mockImplementation((event: string, handler: (value: any) => void) => {
        if (event === 'message') {
          mockWorker.postMessage.mockImplementationOnce(msg => {
            // Verify that string data is not double-serialized
            expect(msg.data).toBe('{"key":"value"}');
            // Simulate success response
            setTimeout(() => handler({ type: 'result', results: ['ok'] }), 0);
          });
        }
      });

      vi.mocked(Worker).mockImplementation(() => mockWorker as any);

      const _repl = await createRepl({ test: 'data' }, options, mockContext, {
        prompt: '> ',
        realTimeEvaluation: false,
      });

      const evaluatorCall = vi.mocked(ReplManager).mock.calls[0];
      const evaluator = evaluatorCall[2];

      await evaluator('.test', '{"key":"value"}', options);

      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'eval',
        expression: '.test',
        data: '{"key":"value"}',
        options: options,
        lastResult: undefined,
      });
    });
  });
});
