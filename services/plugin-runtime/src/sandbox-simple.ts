import { z } from 'zod';
import vm from 'node:vm';

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
  async execute(code: string, context: PluginContext): Promise<PluginResult> {
    const startTime = Date.now();
    const logs: string[] = [];
    const errors: string[] = [];
    
    try {
      // Only support JavaScript for now
      if (!code.startsWith('(function') && !code.startsWith('function')) {
        throw new Error('Only JavaScript plugins are supported');
      }
      
      return await this.executeJavaScript(code, context, logs, errors, startTime);
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
    const memBefore = process.memoryUsage().heapUsed;
    
    // Create sandbox context
    const sandbox = {
      console: {
        log: (...args: any[]) => logs.push(args.join(' ')),
        error: (...args: any[]) => errors.push(args.join(' ')),
      },
      context,
      nexus: await this.createSafeAPI(context.context.permissions),
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      Promise: Promise,
      JSON: JSON,
      Object: Object,
      Array: Array,
      String: String,
      Number: Number,
      Boolean: Boolean,
      Date: Date,
      Math: Math,
      RegExp: RegExp,
    };

    const vmContext = vm.createContext(sandbox);
    
    try {
      // Wrap code in async function
      const wrappedCode = `
        (async function() {
          ${code}
          
          if (typeof main === 'function') {
            return await main(context.input, context.config);
          }
          throw new Error('Plugin must export a main function');
        })()
      `;

      const script = new vm.Script(wrappedCode);
      const output = await script.runInContext(vmContext, {
        timeout: 5000,
        displayErrors: true,
      });
      
      const memAfter = process.memoryUsage().heapUsed;
      
      return {
        output,
        logs,
        errors,
        metrics: {
          executionTime: Date.now() - startTime,
          memoryUsed: memAfter - memBefore,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        errors.push(error.message);
      }
      throw error;
    }
  }

  async validate(code: string): Promise<{ valid: boolean; error?: string }> {
    try {
      if (!code.startsWith('(function') && !code.startsWith('function')) {
        return { valid: false, error: 'Only JavaScript plugins are supported' };
      }
      
      // Try to compile the script
      new vm.Script(code);
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
    
    const sandbox = {
      metadata: undefined,
    };
    
    const vmContext = vm.createContext(sandbox);
    
    try {
      const script = new vm.Script(`${code}\nmetadata;`);
      const result = script.runInContext(vmContext, {
        timeout: 1000,
        displayErrors: true,
      });
      
      // Validate metadata
      return pluginMetadataSchema.parse(result);
    } catch (error) {
      throw new Error('Failed to extract metadata: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
      const storage = new Map<string, any>();
      
      api.storage = {
        get: async (key: string) => {
          return storage.get(key) || null;
        },
        set: async (key: string, value: any) => {
          storage.set(key, value);
        },
        delete: async (key: string) => {
          storage.delete(key);
        },
      };
    }
    
    // UI API
    if (permissions.includes('ui')) {
      api.ui = {
        showNotification: (message: string, type?: string) => {
          console.log(`[Notification] ${type || 'info'}: ${message}`);
        },
        showDialog: async (options: any) => {
          console.log('[Dialog]', options);
          return { confirmed: true };
        },
      };
    }
    
    return api;
  }
}