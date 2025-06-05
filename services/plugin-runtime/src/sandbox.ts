import { WASI } from '@wasmer/wasi';
import { WasmFs } from '@wasmer/wasmfs';
import { getQuickJS } from 'quickjs-emscripten';
import ivm from 'isolated-vm';
import { z } from 'zod';

interface PluginContext {
  input: any;
  config: any;
  context: {
    userId: string;
    projectId: string;
    permissions: string[];
  };
}

interface PluginResult {
  output?: any;
  logs: string[];
  errors: string[];
  metrics: {
    executionTime: number;
    memoryUsed: number;
  };
}

const pluginMetadataSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  author: z.string(),
  permissions: z.array(z.string()),
  config: z.record(z.any()).optional(),
  exports: z.array(z.string()),
});

export class PluginSandbox {
  private isolate: ivm.Isolate;

  constructor() {
    this.isolate = new ivm.Isolate({ memoryLimit: 128 });
  }

  async execute(code: string, context: PluginContext): Promise<PluginResult> {
    const startTime = Date.now();
    const logs: string[] = [];
    const errors: string[] = [];
    
    try {
      // Determine plugin type based on code
      if (code.startsWith('(function') || code.startsWith('function')) {
        // JavaScript plugin
        return await this.executeJavaScript(code, context, logs, errors, startTime);
      } else if (this.isWasmModule(code)) {
        // WebAssembly plugin
        return await this.executeWebAssembly(code, context, logs, errors, startTime);
      } else {
        throw new Error('Unsupported plugin format');
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      return {
        logs,
        errors,
        metrics: {
          executionTime: Date.now() - startTime,
          memoryUsed: 0,
        },
      };
    }
  }

  private async executeJavaScript(
    code: string,
    context: PluginContext,
    logs: string[],
    errors: string[],
    startTime: number
  ): Promise<PluginResult> {
    const isolateContext = await this.isolate.createContext();
    const jail = isolateContext.global;
    
    // Set up console
    await jail.set('console', {
      log: (...args: any[]) => logs.push(args.join(' ')),
      error: (...args: any[]) => errors.push(args.join(' ')),
    });
    
    // Set up context
    await jail.set('__context', new ivm.ExternalCopy(context).copyInto());
    
    // Create safe API
    const api = await this.createSafeAPI(context.context.permissions);
    await jail.set('nexus', new ivm.ExternalCopy(api).copyInto());
    
    try {
      // Compile and run the plugin
      const script = await this.isolate.compileScript(`
        (async function() {
          const context = __context;
          ${code}
          
          if (typeof main === 'function') {
            return await main(context.input, context.config);
          }
          throw new Error('Plugin must export a main function');
        })()
      `);
      
      const result = await script.run(isolateContext, {
        timeout: 5000,
        promise: true,
      });
      
      const output = result ? result.copy() : undefined;
      
      return {
        output,
        logs,
        errors,
        metrics: {
          executionTime: Date.now() - startTime,
          memoryUsed: await this.isolate.getHeapStatistics().then(s => s.used_heap_size),
        },
      };
    } finally {
      isolateContext.release();
    }
  }

  private async executeWebAssembly(
    code: string,
    context: PluginContext,
    logs: string[],
    errors: string[],
    startTime: number
  ): Promise<PluginResult> {
    // Create WASI environment
    const wasmFs = new WasmFs();
    
    const wasi = new WASI({
      args: [],
      env: {
        PLUGIN_INPUT: JSON.stringify(context.input),
        PLUGIN_CONFIG: JSON.stringify(context.config),
      },
      bindings: {
        ...WASI.defaultBindings,
        fs: wasmFs.fs,
      },
    });
    
    // Compile WebAssembly module
    const wasmModule = await WebAssembly.compile(Buffer.from(code, 'base64'));
    const instance = await WebAssembly.instantiate(wasmModule, {
      wasi_snapshot_preview1: wasi.wasiImport,
    });
    
    // Run the module
    wasi.start(instance as any);
    
    // Read output from virtual filesystem
    const outputPath = '/output.json';
    let output;
    
    try {
      const outputData = wasmFs.fs.readFileSync(outputPath, 'utf8');
      output = JSON.parse(outputData);
    } catch (error) {
      errors.push('Failed to read plugin output');
    }
    
    // Read logs
    const logPath = '/logs.txt';
    try {
      const logData = wasmFs.fs.readFileSync(logPath, 'utf8');
      logs.push(...logData.split('\n').filter(Boolean));
    } catch {
      // No logs
    }
    
    return {
      output,
      logs,
      errors,
      metrics: {
        executionTime: Date.now() - startTime,
        memoryUsed: 0, // WASI doesn't provide memory statistics
      },
    };
  }

  async validate(code: string): Promise<{ valid: boolean; error?: string }> {
    try {
      if (code.startsWith('(function') || code.startsWith('function')) {
        // Validate JavaScript
        await this.isolate.compileScript(code);
      } else if (this.isWasmModule(code)) {
        // Validate WebAssembly
        await WebAssembly.compile(Buffer.from(code, 'base64'));
      } else {
        return { valid: false, error: 'Unsupported plugin format' };
      }
      
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  async getMetadata(code: string): Promise<any> {
    if (!code.startsWith('(function') && !code.startsWith('function')) {
      throw new Error('Metadata extraction only supported for JavaScript plugins');
    }
    
    const isolateContext = await this.isolate.createContext();
    const jail = isolateContext.global;
    
    try {
      const script = await this.isolate.compileScript(`
        ${code}
        
        if (typeof metadata === 'object') {
          metadata;
        } else {
          throw new Error('Plugin must export metadata object');
        }
      `);
      
      const result = await script.run(isolateContext);
      const metadata = result.copy();
      
      // Validate metadata
      return pluginMetadataSchema.parse(metadata);
    } finally {
      isolateContext.release();
    }
  }

  private async createSafeAPI(permissions: string[]): Promise<any> {
    const api: any = {};
    
    // HTTP API
    if (permissions.includes('http')) {
      api.http = {
        fetch: async (url: string, options?: any) => {
          // Validate URL
          if (!url.startsWith('https://')) {
            throw new Error('Only HTTPS URLs are allowed');
          }
          
          // Make request with timeout
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          
          try {
            const response = await fetch(url, {
              ...options,
              signal: controller.signal,
            });
            
            return {
              status: response.status,
              headers: Object.fromEntries(response.headers.entries()),
              text: await response.text(),
            };
          } finally {
            clearTimeout(timeout);
          }
        },
      };
    }
    
    // Storage API
    if (permissions.includes('storage')) {
      api.storage = {
        get: async (key: string) => {
          // Implement storage get
          return null;
        },
        set: async (key: string, value: any) => {
          // Implement storage set
        },
        delete: async (key: string) => {
          // Implement storage delete
        },
      };
    }
    
    // Database API
    if (permissions.includes('database')) {
      api.database = {
        query: async (query: string, params?: any[]) => {
          // Implement safe database queries
          throw new Error('Database access not implemented');
        },
      };
    }
    
    // UI API
    if (permissions.includes('ui')) {
      api.ui = {
        showNotification: (message: string, type?: string) => {
          // Implement UI notifications
        },
        showDialog: async (options: any) => {
          // Implement UI dialogs
        },
      };
    }
    
    return api;
  }

  private isWasmModule(code: string): boolean {
    try {
      const buffer = Buffer.from(code, 'base64');
      // WebAssembly magic number: 0x00 0x61 0x73 0x6d
      return buffer[0] === 0x00 && 
             buffer[1] === 0x61 && 
             buffer[2] === 0x73 && 
             buffer[3] === 0x6d;
    } catch {
      return false;
    }
  }
}