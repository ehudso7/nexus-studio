import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { z } from 'zod';
import * as prettier from 'prettier';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { Component, Page, Project } from '@nexus/database';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface AIGenerationOptions {
  provider?: 'openai' | 'anthropic';
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class AIAssistant {
  async generateComponent(
    description: string,
    context: {
      projectType: string;
      existingComponents?: Component[];
      designSystem?: any;
    },
    options: AIGenerationOptions = {}
  ): Promise<Component> {
    const provider = options.provider || 'openai';
    const prompt = this.buildComponentPrompt(description, context);
    
    const response = provider === 'openai' 
      ? await this.generateWithOpenAI(prompt, options)
      : await this.generateWithAnthropic(prompt, options);
    
    return this.parseComponentResponse(response);
  }

  async optimizeCode(
    code: string,
    optimizationGoals: string[],
    options: AIGenerationOptions = {}
  ): Promise<string> {
    const provider = options.provider || 'openai';
    const prompt = this.buildOptimizationPrompt(code, optimizationGoals);
    
    const response = provider === 'openai'
      ? await this.generateWithOpenAI(prompt, options)
      : await this.generateWithAnthropic(prompt, options);
    
    // Format the optimized code
    return prettier.format(response, {
      parser: 'typescript',
      semi: true,
      singleQuote: true,
      trailingComma: 'es5',
    });
  }

  async generatePageLayout(
    description: string,
    components: Component[],
    options: AIGenerationOptions = {}
  ): Promise<any> {
    const provider = options.provider || 'openai';
    const prompt = this.buildPageLayoutPrompt(description, components);
    
    const response = provider === 'openai'
      ? await this.generateWithOpenAI(prompt, options)
      : await this.generateWithAnthropic(prompt, options);
    
    return JSON.parse(response);
  }

  async suggestImprovements(
    project: Project & { pages: Page[]; components: Component[] },
    options: AIGenerationOptions = {}
  ): Promise<string[]> {
    const provider = options.provider || 'openai';
    const prompt = this.buildImprovementPrompt(project);
    
    const response = provider === 'openai'
      ? await this.generateWithOpenAI(prompt, options)
      : await this.generateWithAnthropic(prompt, options);
    
    return response.split('\n').filter(line => line.trim());
  }

  async generateFromScreenshot(
    imageUrl: string,
    options: AIGenerationOptions = {}
  ): Promise<{ components: Component[]; layout: any }> {
    // Only OpenAI supports vision currently
    const prompt = 'Analyze this UI screenshot and generate component definitions and layout structure in JSON format.';
    
    const response = await openai.chat.completions.create({
      model: options.model || 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000,
    });
    
    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  }

  async explainCode(
    code: string,
    options: AIGenerationOptions = {}
  ): Promise<string> {
    const provider = options.provider || 'openai';
    const prompt = `Explain the following code in simple terms:\n\n${code}`;
    
    return provider === 'openai'
      ? await this.generateWithOpenAI(prompt, options)
      : await this.generateWithAnthropic(prompt, options);
  }

  async convertDesign(
    designData: any,
    targetFramework: 'react' | 'vue' | 'angular',
    options: AIGenerationOptions = {}
  ): Promise<string> {
    const provider = options.provider || 'openai';
    const prompt = this.buildConversionPrompt(designData, targetFramework);
    
    const response = provider === 'openai'
      ? await this.generateWithOpenAI(prompt, options)
      : await this.generateWithAnthropic(prompt, options);
    
    return prettier.format(response, {
      parser: 'typescript',
      semi: true,
      singleQuote: true,
      trailingComma: 'es5',
    });
  }

  async generateTests(
    component: Component,
    testFramework: 'jest' | 'vitest' | 'cypress',
    options: AIGenerationOptions = {}
  ): Promise<string> {
    const provider = options.provider || 'openai';
    const prompt = this.buildTestPrompt(component, testFramework);
    
    return provider === 'openai'
      ? await this.generateWithOpenAI(prompt, options)
      : await this.generateWithAnthropic(prompt, options);
  }

  async analyzePerformance(
    code: string,
    options: AIGenerationOptions = {}
  ): Promise<{
    issues: Array<{ line: number; issue: string; suggestion: string }>;
    score: number;
    recommendations: string[];
  }> {
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
    
    const issues: Array<{ line: number; issue: string; suggestion: string }> = [];
    
    // Analyze AST for performance issues
    traverse(ast, {
      CallExpression(path) {
        // Check for inefficient array methods in render
        if (
          path.node.callee.type === 'MemberExpression' &&
          path.node.callee.property.type === 'Identifier' &&
          ['map', 'filter', 'reduce'].includes(path.node.callee.property.name)
        ) {
          const parent = path.getFunctionParent();
          if (parent?.node.type === 'FunctionDeclaration' && parent.node.id?.name?.includes('render')) {
            issues.push({
              line: path.node.loc?.start.line || 0,
              issue: 'Array operation in render method',
              suggestion: 'Consider memoizing this operation',
            });
          }
        }
      },
      JSXElement(path) {
        // Check for inline functions
        path.node.openingElement.attributes.forEach((attr) => {
          if (
            attr.type === 'JSXAttribute' &&
            attr.value?.type === 'JSXExpressionContainer' &&
            attr.value.expression.type === 'ArrowFunctionExpression'
          ) {
            issues.push({
              line: attr.loc?.start.line || 0,
              issue: 'Inline function in JSX',
              suggestion: 'Extract to a useCallback or class method',
            });
          }
        });
      },
    });
    
    // Calculate score
    const score = Math.max(0, 100 - issues.length * 10);
    
    // Get AI recommendations
    const provider = options.provider || 'openai';
    const prompt = `Analyze this code for performance issues and provide recommendations:\n\n${code}`;
    
    const aiResponse = provider === 'openai'
      ? await this.generateWithOpenAI(prompt, options)
      : await this.generateWithAnthropic(prompt, options);
    
    const recommendations = aiResponse.split('\n').filter(line => line.trim());
    
    return { issues, score, recommendations };
  }

  private async generateWithOpenAI(
    prompt: string,
    options: AIGenerationOptions
  ): Promise<string> {
    const response = await openai.chat.completions.create({
      model: options.model || 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000,
    });
    
    return response.choices[0]?.message?.content || '';
  }

  private async generateWithAnthropic(
    prompt: string,
    options: AIGenerationOptions
  ): Promise<string> {
    const response = await anthropic.messages.create({
      model: options.model || 'claude-3-opus-20240229',
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000,
    });
    
    return response.content[0]?.text || '';
  }

  private buildComponentPrompt(description: string, context: any): string {
    return `Generate a React component based on this description: ${description}

Context:
- Project type: ${context.projectType}
- Design system: ${JSON.stringify(context.designSystem || {})}

Return a JSON object with:
{
  "name": "ComponentName",
  "type": "CUSTOM",
  "props": { ... },
  "styles": { ... },
  "code": "// React component code"
}`;
  }

  private buildOptimizationPrompt(code: string, goals: string[]): string {
    return `Optimize this code for: ${goals.join(', ')}

Code:
${code}

Return only the optimized code without explanations.`;
  }

  private buildPageLayoutPrompt(description: string, components: Component[]): string {
    const componentList = components.map(c => `- ${c.name} (${c.type})`).join('\n');
    
    return `Create a page layout based on: ${description}

Available components:
${componentList}

Return a JSON object with the layout structure.`;
  }

  private buildImprovementPrompt(project: any): string {
    return `Analyze this project and suggest improvements:

Project: ${project.name}
Type: ${project.type}
Pages: ${project.pages.length}
Components: ${project.components.length}

Provide specific, actionable suggestions as a numbered list.`;
  }

  private buildConversionPrompt(designData: any, framework: string): string {
    return `Convert this design to ${framework} code:

${JSON.stringify(designData, null, 2)}

Return only the component code.`;
  }

  private buildTestPrompt(component: Component, framework: string): string {
    return `Generate ${framework} tests for this component:

Component: ${component.name}
Type: ${component.type}
Props: ${JSON.stringify(component.props)}

Return complete test code.`;
  }

  private parseComponentResponse(response: string): Component {
    try {
      const parsed = JSON.parse(response);
      return {
        id: '',
        name: parsed.name,
        type: parsed.type || 'CUSTOM',
        category: 'AI Generated',
        props: parsed.props || {},
        styles: parsed.styles || {},
        events: parsed.events || {},
        children: [],
        isGlobal: false,
        isLocked: false,
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        projectId: null,
      };
    } catch (error) {
      throw new Error('Failed to parse AI response');
    }
  }
}