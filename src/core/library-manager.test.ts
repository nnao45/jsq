import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { JsqOptions } from '@/types/cli';
import { LibraryManager } from './library-manager';

// Mock the file system and npm operations for testing
jest.mock('node:fs/promises');
jest.mock('node:child_process');
jest.mock('node:path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => `/${args.join('/')}`),
}));
jest.mock('node:os', () => ({
  homedir: jest.fn(() => '/mocked/home'),
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const _mockPath = path as jest.Mocked<typeof path>;
const _mockOs = os as jest.Mocked<typeof os>;

describe('LibraryManager', () => {
  let libraryManager: LibraryManager;
  let mockOptions: JsqOptions;
  let tempCacheDir: string;

  beforeAll(() => {
    // Suppress console warnings for all tests in this suite
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  beforeEach(() => {
    mockOptions = {
      debug: false,
      verbose: false,
      unsafe: false,
    };

    // Setup mocks before creating LibraryManager
    mockFs.mkdir.mockResolvedValue(undefined);

    tempCacheDir = '/mocked/home/.jsq/cache';
    libraryManager = new LibraryManager(mockOptions);

    // Reset all mocks after setup
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Library name and version parsing', () => {
    it('should parse library name without version', () => {
      expect(libraryManager.parseLibraryName('lodash')).toBe('lodash');
      expect(libraryManager.parseLibraryName('moment')).toBe('moment');
      expect(libraryManager.parseLibraryName('@types/node')).toBe('@types/node');
    });

    it('should parse library name with version', () => {
      expect(libraryManager.parseLibraryName('lodash@4.17.21')).toBe('lodash');
      expect(libraryManager.parseLibraryName('moment@2.29.4')).toBe('moment');
      expect(libraryManager.parseLibraryName('@types/node@18.0.0')).toBe('@types/node');
    });

    it('should parse version from spec', () => {
      expect(libraryManager.parseLibraryVersion('lodash@4.17.21')).toBe('4.17.21');
      expect(libraryManager.parseLibraryVersion('moment@^2.29.0')).toBe('^2.29.0');
      expect(libraryManager.parseLibraryVersion('@types/node@~18.0.0')).toBe('~18.0.0');
    });

    it('should return undefined for version when not specified', () => {
      expect(libraryManager.parseLibraryVersion('lodash')).toBeUndefined();
      expect(libraryManager.parseLibraryVersion('moment')).toBeUndefined();
      expect(libraryManager.parseLibraryVersion('@types/node')).toBeUndefined();
    });

    it('should handle complex version specifications', () => {
      expect(libraryManager.parseLibraryVersion('lodash@>=4.0.0 <5.0.0')).toBe('>=4.0.0 <5.0.0');
      expect(libraryManager.parseLibraryVersion('react@^17.0.0 || ^18.0.0')).toBe(
        '^17.0.0 || ^18.0.0'
      );
    });
  });

  describe('Cache directory management', () => {
    it.skip('should create cache directory if it does not exist', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);

      await libraryManager.ensureCacheDir();

      expect(mockFs.mkdir).toHaveBeenCalledWith(tempCacheDir, { recursive: true });
    });

    it.skip('should handle cache directory creation errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      await libraryManager.ensureCacheDir();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Warning: Could not create cache directory:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('Library loading and caching', () => {
    it('should handle single library string input', async () => {
      const mockLoadLibrary = jest
        .spyOn(libraryManager, 'loadLibrary' as keyof LibraryManager)
        .mockResolvedValue({ test: 'library' });

      const result = await libraryManager.loadLibraries('lodash');

      expect(mockLoadLibrary).toHaveBeenCalledWith('lodash');
      expect(result).toEqual({ lodash: { test: 'library' } });
    });

    it('should handle comma-separated library string input', async () => {
      const mockLoadLibrary = jest
        .spyOn(libraryManager, 'loadLibrary' as keyof LibraryManager)
        .mockImplementation((spec: string) => Promise.resolve({ name: spec }));

      const result = await libraryManager.loadLibraries('lodash, moment, dayjs');

      expect(mockLoadLibrary).toHaveBeenCalledTimes(3);
      expect(mockLoadLibrary).toHaveBeenCalledWith('lodash');
      expect(mockLoadLibrary).toHaveBeenCalledWith('moment');
      expect(mockLoadLibrary).toHaveBeenCalledWith('dayjs');
      expect(result).toEqual({
        lodash: { name: 'lodash' },
        moment: { name: 'moment' },
        dayjs: { name: 'dayjs' },
      });
    });

    it('should handle array input', async () => {
      const mockLoadLibrary = jest
        .spyOn(libraryManager, 'loadLibrary' as keyof LibraryManager)
        .mockImplementation((spec: string) => Promise.resolve({ name: spec }));

      const result = await libraryManager.loadLibraries(['lodash', 'moment']);

      expect(mockLoadLibrary).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        lodash: { name: 'lodash' },
        moment: { name: 'moment' },
      });
    });

    it('should handle library loading errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const _mockLoadLibrary = jest
        .spyOn(libraryManager, 'loadLibrary' as keyof LibraryManager)
        .mockImplementation((spec: string) => {
          if (spec === 'failing-lib') {
            throw new Error('Library not found');
          }
          return Promise.resolve({ name: spec });
        });

      const result = await libraryManager.loadLibraries(['lodash', 'failing-lib', 'moment']);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '✗ Failed to load library failing-lib:',
        'Library not found'
      );
      expect(result).toEqual({
        lodash: { name: 'lodash' },
        moment: { name: 'moment' },
      });

      consoleErrorSpy.mockRestore();
    });

    it('should log successful library loads in verbose mode', async () => {
      const verboseManager = new LibraryManager({ ...mockOptions, verbose: true });
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const _mockLoadLibrary = jest
        .spyOn(verboseManager, 'loadLibrary' as keyof LibraryManager)
        .mockResolvedValue({ name: 'lodash' });

      await verboseManager.loadLibraries('lodash');

      expect(consoleErrorSpy).toHaveBeenCalledWith('✓ Loaded library: lodash');
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Cache validation', () => {
    it.skip('should validate cached library exists and is not too old', async () => {
      const libraryInfo = {
        name: 'lodash',
        version: '4.17.21',
        path: '/fake/path',
        exports: {},
        cached: true,
        installedAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      };

      mockFs.access.mockResolvedValue(undefined);

      const isValid = await libraryManager.validateCachedLibrary(libraryInfo);
      expect(isValid).toBe(true);
    });

    it('should invalidate cached library if file does not exist', async () => {
      const libraryInfo = {
        name: 'lodash',
        version: '4.17.21',
        path: '/fake/path',
        exports: {},
        cached: true,
        installedAt: new Date(),
      };

      mockFs.access.mockRejectedValue(new Error('File not found'));

      const isValid = await libraryManager.validateCachedLibrary(libraryInfo);
      expect(isValid).toBe(false);
    });

    it('should invalidate cached library if it is too old', async () => {
      const libraryInfo = {
        name: 'lodash',
        version: '4.17.21',
        path: '/fake/path',
        exports: {},
        cached: true,
        installedAt: new Date(Date.now() - 1000 * 60 * 60 * 25), // 25 hours ago
      };

      mockFs.access.mockResolvedValue(undefined);

      const isValid = await libraryManager.validateCachedLibrary(libraryInfo);
      expect(isValid).toBe(false);
    });
  });

  describe('Library installation and loading', () => {
    it.skip('should install and load library correctly', async () => {
      const mockPackageJson = {
        name: 'lodash',
        version: '4.17.21',
        main: 'index.js',
      };

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockPackageJson));
      mockFs.stat.mockResolvedValue({ isFile: () => true } as unknown as import('node:fs').Stats);

      const mockRunNpmInstall = jest
        .spyOn(libraryManager, 'runNpmInstall' as keyof LibraryManager)
        .mockResolvedValue(undefined);

      const _mockRequireLibrary = jest
        .spyOn(libraryManager, 'requireLibrary' as keyof LibraryManager)
        .mockResolvedValue({ _: 'lodash functions' });

      const result = await libraryManager.installAndLoadLibrary('lodash', undefined);

      expect(mockRunNpmInstall).toHaveBeenCalledWith(
        'lodash',
        expect.stringContaining('node_modules')
      );
      expect(result.name).toBe('lodash');
      expect(result.version).toBe('4.17.21');
      expect(result.exports).toEqual({ _: 'lodash functions' });
    });

    it.skip('should handle installation errors', async () => {
      const _mockRunNpmInstall = jest
        .spyOn(libraryManager, 'runNpmInstall' as keyof LibraryManager)
        .mockRejectedValue(new Error('npm install failed'));

      await expect(libraryManager.installAndLoadLibrary('invalid-lib', undefined)).rejects.toThrow(
        'Failed to install/load library invalid-lib: npm install failed'
      );
    });
  });

  describe('Library requiring/importing', () => {
    it.skip('should try ES module import first, then CommonJS require', async () => {
      const mockLibraryPath = '/fake/path/to/library';

      // Mock dynamic import to succeed
      const originalImport = jest.fn().mockResolvedValue({ default: { test: 'esm' } });
      (global as typeof global & { import?: unknown }).import = originalImport;

      const result = await libraryManager.requireLibrary(mockLibraryPath);

      expect(result).toEqual({ test: 'esm' });
    });

    it.skip('should fallback to require if import fails', async () => {
      const mockLibraryPath = '/fake/path/to/library';

      // Mock dynamic import to fail
      const originalImport = jest.fn().mockRejectedValue(new Error('ES module error'));
      (global as typeof global & { import?: unknown }).import = originalImport;

      // Mock require through jest
      const originalRequire = require;
      (global as typeof global & { require?: unknown }).require = jest
        .fn()
        .mockReturnValue({ test: 'commonjs' });

      const result = await libraryManager.requireLibrary(mockLibraryPath);

      expect(result).toEqual({ test: 'commonjs' });

      // Restore
      (global as typeof global & { require?: unknown }).require = originalRequire;
    });

    it('should throw error if both import and require fail', async () => {
      const mockLibraryPath = '/fake/path/to/library';

      // Mock dynamic import to fail
      const originalImport = jest.fn().mockRejectedValue(new Error('ES module error'));
      (global as typeof global & { import?: unknown }).import = originalImport;

      // Mock require to fail
      const originalRequire = require;
      (global as typeof global & { require?: unknown }).require = jest
        .fn()
        .mockImplementation(() => {
          throw new Error('CommonJS require error');
        });

      await expect(libraryManager.requireLibrary(mockLibraryPath)).rejects.toThrow(
        'Could not load library from'
      );

      // Restore
      (global as typeof global & { require?: unknown }).require = originalRequire;
    });
  });

  describe('Cache management', () => {
    it.skip('should clear all caches', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockFs.rm.mockResolvedValue(undefined);
      mockFs.mkdir.mockResolvedValue(undefined);

      const verboseManager = new LibraryManager({ ...mockOptions, verbose: true });
      await verboseManager.clearCache();

      expect(mockFs.rm).toHaveBeenCalledWith(tempCacheDir, { recursive: true, force: true });
      expect(consoleErrorSpy).toHaveBeenCalledWith('✓ Cache cleared');

      consoleErrorSpy.mockRestore();
    });

    it.skip('should handle cache clear errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockFs.rm.mockRejectedValue(new Error('Permission denied'));

      await libraryManager.clearCache();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Warning: Could not clear cache directory:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should provide cache information', () => {
      const cacheInfo = libraryManager.getCacheInfo();

      expect(cacheInfo).toHaveProperty('libraries');
      expect(cacheInfo).toHaveProperty('cacheDir');
      expect(cacheInfo.cacheDir).toBe(tempCacheDir);
    });

    it('should find library info by name', async () => {
      // Manually add to cache for testing
      const mockLibraryInfo = {
        name: 'lodash',
        version: '4.17.21',
        path: '/fake/path',
        exports: {},
        cached: true,
        installedAt: new Date(),
      };

      libraryManager.libraryCache.set('lodash@latest', mockLibraryInfo);

      const result = await libraryManager.getLibraryInfo('lodash');
      expect(result).toEqual(mockLibraryInfo);
    });

    it('should return null for non-existent library info', async () => {
      const result = await libraryManager.getLibraryInfo('non-existent-lib');
      expect(result).toBeNull();
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle popular library specifications', async () => {
      const popularLibs = [
        'lodash@4.17.21',
        'moment@^2.29.0',
        'dayjs@~1.11.0',
        'axios@latest',
        '@types/node@18.0.0',
      ];

      popularLibs.forEach(spec => {
        const name = libraryManager.parseLibraryName(spec);
        const version = libraryManager.parseLibraryVersion(spec);

        expect(name).toBeTruthy();
        expect(typeof name).toBe('string');

        if (spec.includes('@') && !spec.startsWith('@types')) {
          expect(version).toBeTruthy();
        }
      });
    });

    it('should handle scoped package names correctly', async () => {
      const scopedPackages = [
        '@babel/core',
        '@types/node@18.0.0',
        '@angular/core@^15.0.0',
        '@vue/composition-api',
      ];

      scopedPackages.forEach(spec => {
        const name = libraryManager.parseLibraryName(spec);
        expect(name.startsWith('@')).toBe(true);
        expect(name.includes('/')).toBe(true);
      });
    });

    it('should handle library loading with version preferences', async () => {
      const _mockLoadLibrary = jest
        .spyOn(libraryManager, 'loadLibrary' as keyof LibraryManager)
        .mockImplementation((spec: string) => {
          const name = libraryManager.parseLibraryName(spec);
          const version = libraryManager.parseLibraryVersion(spec);
          return Promise.resolve({
            name,
            requestedVersion: version,
            actualVersion: '1.0.0',
          });
        });

      const result = await libraryManager.loadLibraries([
        'lodash@^4.0.0',
        'moment@latest',
        'dayjs',
      ]);

      expect(result.lodash.requestedVersion).toBe('^4.0.0');
      expect(result.moment.requestedVersion).toBe('latest');
      expect(result.dayjs.requestedVersion).toBeUndefined();
    });
  });

  describe('Error scenarios and edge cases', () => {
    it('should handle empty library list', async () => {
      const result = await libraryManager.loadLibraries([]);
      expect(result).toEqual({});
    });

    it.skip('should handle malformed library specifications gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockLoadLibrary = jest
        .spyOn(libraryManager, 'loadLibrary' as keyof LibraryManager)
        .mockImplementation((spec: string) => {
          if (spec.trim() === '') {
            throw new Error('Empty library name');
          }
          return Promise.resolve({ name: spec });
        });

      const result = await libraryManager.loadLibraries('lodash,  , moment, ');

      // Should skip empty specs
      expect(mockLoadLibrary).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        lodash: { name: 'lodash' },
        moment: { name: 'moment' },
      });

      consoleErrorSpy.mockRestore();
    });
  });
});
