import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import NodeCache from 'node-cache';
import type { JsqOptions, LibraryCache, LibraryInfo } from '@/types/cli';
import { detectRuntime } from '@/utils/runtime';

export class LibraryManager {
  private cache: NodeCache;
  private cacheDir: string;
  private libraryCache: Map<string, LibraryInfo>;
  private options: JsqOptions;

  constructor(options: JsqOptions) {
    this.options = options;
    this.cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache
    this.cacheDir = path.join(os.homedir(), '.jsq', 'cache');
    this.libraryCache = new Map();
    this.ensureCacheDir();
  }

  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.warn('Warning: Could not create cache directory:', error);
    }
  }

  async loadLibraries(librarySpecs: string | string[]): Promise<Record<string, unknown>> {
    const specs = Array.isArray(librarySpecs)
      ? librarySpecs
      : typeof librarySpecs === 'string'
        ? librarySpecs.split(',').map(s => s.trim())
        : [];

    const loadedLibraries: Record<string, unknown> = {};

    for (const spec of specs) {
      try {
        const library = await this.loadLibrary(spec);
        const libraryName = this.parseLibraryName(spec);
        loadedLibraries[libraryName] = library;

        if (this.options.verbose) {
          console.error(`✓ Loaded library: ${libraryName}`);
        }
      } catch (error) {
        const libraryName = this.parseLibraryName(spec);
        console.error(
          `✗ Failed to load library ${libraryName}:`,
          error instanceof Error ? error.message : error
        );
        // Continue loading other libraries even if one fails
      }
    }

    return loadedLibraries;
  }

  private async loadLibrary(spec: string): Promise<unknown> {
    const libraryName = this.parseLibraryName(spec);
    const version = this.parseLibraryVersion(spec);

    // Check cache first
    const cacheKey = `${libraryName}@${version || 'latest'}`;
    const cached = this.cache.get<LibraryInfo>(cacheKey);

    if (cached && (await this.validateCachedLibrary(cached))) {
      if (this.options.verbose) {
        console.error(`Using cached: ${libraryName}@${cached.version}`);
      }
      return cached.exports;
    }

    // Install and load the library
    const libraryInfo = await this.installAndLoadLibrary(libraryName, version);

    // Cache the result
    this.cache.set(cacheKey, libraryInfo);
    this.libraryCache.set(cacheKey, libraryInfo);

    return libraryInfo.exports;
  }

  private parseLibraryName(spec: string): string {
    // Handle scoped packages like @lodash/fp and version specs like lodash@4.17.21
    const match = spec.match(/^(@?[^@]+)(?:@(.+))?$/);
    return match?.[1] || spec;
  }

  private parseLibraryVersion(spec: string): string | undefined {
    const match = spec.match(/^@?[^@]+@(.+)$/);
    return match?.[1];
  }

  private async validateCachedLibrary(library: LibraryInfo): Promise<boolean> {
    try {
      // Check if the cached library path still exists
      await fs.access(library.path);

      // Check if cache is not too old (24 hours)
      const cacheAge = Date.now() - library.installedAt.getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      return cacheAge < maxAge;
    } catch {
      return false;
    }
  }

  private async installAndLoadLibrary(name: string, version?: string): Promise<LibraryInfo> {
    const installSpec = version ? `${name}@${version}` : name;
    const libraryDir = path.join(this.cacheDir, 'node_modules');

    // Ensure node_modules directory exists
    await fs.mkdir(libraryDir, { recursive: true });

    try {
      // Install the library using npm
      await this.runNpmInstall(installSpec, libraryDir);

      // Load the library
      const libraryPath = path.join(libraryDir, name);
      const packageJsonPath = path.join(libraryPath, 'package.json');

      // Read package.json to get version and main entry
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      const mainEntry = packageJson.main || 'index.js';
      const mainPath = path.join(libraryPath, mainEntry);

      // Dynamically import the library
      const exports = await this.requireLibrary(mainPath);

      return {
        name,
        version: packageJson.version,
        path: libraryPath,
        exports,
        cached: true,
        installedAt: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Failed to install/load library ${name}: ${error instanceof Error ? error.message : error}`
      );
    }
  }

  private async runNpmInstall(spec: string, cwd: string): Promise<void> {
    const runtime = detectRuntime();
    const packageManager = this.getPackageManager();
    const args = this.getInstallArgs(spec, runtime);

    return new Promise((resolve, reject) => {
      const childProcess = spawn(packageManager, args, {
        cwd,
        stdio: this.options.verbose ? 'inherit' : 'pipe',
      });

      childProcess.on('close', code => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`${packageManager} install failed with code ${code}`));
        }
      });

      childProcess.on('error', error => {
        reject(new Error(`${packageManager} install error: ${error.message}`));
      });

      // Set timeout for package install
      const timeout = setTimeout(() => {
        childProcess.kill();
        reject(new Error(`${packageManager} install timed out`));
      }, 60000); // 60 second timeout

      childProcess.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }

  private async requireLibrary(libraryPath: string): Promise<unknown> {
    try {
      // Use dynamic import to load the library
      const library = await import(libraryPath);

      // Return the default export if available, otherwise return the entire module
      return library.default || library;
    } catch (error) {
      // Fallback to require for CommonJS modules
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require(libraryPath);
      } catch (_requireError) {
        throw new Error(
          `Could not load library from ${libraryPath}: ${error instanceof Error ? error.message : error}`
        );
      }
    }
  }

  async clearCache(): Promise<void> {
    this.cache.flushAll();
    this.libraryCache.clear();

    try {
      await fs.rm(this.cacheDir, { recursive: true, force: true });
      await this.ensureCacheDir();
      if (this.options.verbose) {
        console.error('✓ Cache cleared');
      }
    } catch (error) {
      console.error('Warning: Could not clear cache directory:', error);
    }
  }

  getCacheInfo(): LibraryCache {
    return {
      libraries: this.libraryCache,
      cacheDir: this.cacheDir,
    };
  }

  async getLibraryInfo(name: string): Promise<LibraryInfo | null> {
    for (const [_key, info] of this.libraryCache) {
      if (info.name === name) {
        return info;
      }
    }
    return null;
  }

  private getPackageManager(): string {
    const runtime = detectRuntime();

    switch (runtime) {
      case 'bun':
        return 'bun';
      case 'deno':
        return 'deno'; // Deno can use npm: imports, but for package installation we might need different approach
      default:
        return 'npm';
    }
  }

  private getInstallArgs(spec: string, runtime: string): string[] {
    switch (runtime) {
      case 'bun':
        return ['add', '--no-save', spec];
      case 'deno':
        // For Deno, we might need to handle npm: imports differently
        // For now, fallback to npm
        return ['install', '--no-save', '--prefer-offline', spec];
      default:
        return ['install', '--no-save', '--prefer-offline', spec];
    }
  }
}
