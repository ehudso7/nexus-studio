# AI Assistant Package

This package provides AI-powered features for Nexus Studio, including component generation, code optimization, design-to-code conversion, and performance analysis.

## Features

- **Component Generation**: Generate React components from natural language descriptions
- **Code Optimization**: Optimize code for performance, readability, bundle size, etc.
- **Screenshot to Code**: Convert UI screenshots into working components
- **Performance Analysis**: Analyze code for performance issues with AST parsing
- **Design Conversion**: Convert design data to React, Vue, or Angular code
- **Test Generation**: Generate tests for components
- **Code Explanation**: Get AI-powered explanations of code
- **Project Improvements**: Get suggestions for improving your project

## Supported AI Providers

- OpenAI (GPT-4)
- Anthropic (Claude 3)

## Configuration

Set the following environment variables:

```bash
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

## Usage

```typescript
import { AIAssistant } from '@nexus/ai-assistant';

const assistant = new AIAssistant();

// Generate a component
const component = await assistant.generateComponent(
  'A modern contact form with validation',
  {
    projectType: 'web',
    existingComponents: [],
  }
);

// Optimize code
const optimizedCode = await assistant.optimizeCode(
  originalCode,
  ['performance', 'readability']
);

// Analyze performance
const analysis = await assistant.analyzePerformance(componentCode);
```

## API Endpoints

All AI features are exposed through REST API endpoints:

- `POST /ai/generate-component` - Generate component from description
- `POST /ai/optimize-code` - Optimize code
- `POST /ai/generate-layout` - Generate page layout
- `POST /ai/generate-from-screenshot` - Generate from screenshot
- `POST /ai/convert-design` - Convert design to code
- `POST /ai/explain-code` - Explain code
- `POST /ai/generate-tests` - Generate tests
- `POST /ai/analyze-performance` - Analyze performance
- `POST /ai/suggest-improvements` - Suggest project improvements

## Rate Limiting

AI endpoints are rate-limited to prevent abuse:
- 20 requests per minute per user
- Rate limit headers are included in responses