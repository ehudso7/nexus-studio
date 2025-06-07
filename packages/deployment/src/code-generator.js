export class CodeGenerator {
    async generateProject(project) {
        const files = [];
        const dependencies = {
            'react': '^18.2.0',
            'react-dom': '^18.2.0',
        };
        const devDependencies = {
            '@types/react': '^18.2.48',
            '@types/react-dom': '^18.2.18',
            'typescript': '^5.3.3',
            'vite': '^5.0.12',
            '@vitejs/plugin-react': '^4.2.1',
        };
        // Generate package.json
        files.push({
            path: 'package.json',
            type: 'text',
            content: this.generatePackageJson(project, dependencies, devDependencies),
        });
        // Generate index.html
        files.push({
            path: 'index.html',
            type: 'text',
            content: this.generateIndexHtml(project),
        });
        // Generate main entry file
        files.push({
            path: 'src/main.tsx',
            type: 'text',
            content: this.generateMainEntry(),
        });
        // Generate App component
        files.push({
            path: 'src/App.tsx',
            type: 'text',
            content: this.generateAppComponent(project),
        });
        // Generate pages
        for (const page of project.pages) {
            files.push({
                path: `src/pages/${this.slugify(page.name)}.tsx`,
                type: 'text',
                content: this.generatePageComponent(page),
            });
        }
        // Generate components
        for (const component of project.components) {
            files.push({
                path: `src/components/${this.slugify(component.name)}.tsx`,
                type: 'text',
                content: this.generateComponent(component),
            });
        }
        // Generate styles
        files.push({
            path: 'src/index.css',
            type: 'text',
            content: this.generateStyles(),
        });
        // Generate vite config
        files.push({
            path: 'vite.config.ts',
            type: 'text',
            content: this.generateViteConfig(),
        });
        // Generate TypeScript config
        files.push({
            path: 'tsconfig.json',
            type: 'text',
            content: this.generateTsConfig(),
        });
        return {
            files,
            dependencies,
            devDependencies,
            scripts: {
                'dev': 'vite',
                'build': 'tsc && vite build',
                'preview': 'vite preview',
            },
        };
    }
    generatePackageJson(project, dependencies, devDependencies) {
        return JSON.stringify({
            name: project.slug,
            version: '1.0.0',
            private: true,
            type: 'module',
            scripts: {
                dev: 'vite',
                build: 'tsc && vite build',
                preview: 'vite preview',
            },
            dependencies,
            devDependencies,
        }, null, 2);
    }
    generateIndexHtml(project) {
        return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${project.name}</title>
    <meta name="description" content="${project.description || ''}" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
    }
    generateMainEntry() {
        return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
    }
    generateAppComponent(project) {
        const homePage = project.pages.find(p => p.isHomePage) || project.pages[0];
        return `import React from 'react';
${project.pages.map(page => `import ${this.componentName(page.name)} from './pages/${this.slugify(page.name)}';`).join('\n')}

function App() {
  // Simple routing - in production, use React Router
  const path = window.location.pathname;
  
  ${project.pages.map(page => `
  if (path === '${page.path}') {
    return <${this.componentName(page.name)} />;
  }`).join('')}
  
  return <${this.componentName(homePage?.name || 'Home')} />;
}

export default App;`;
    }
    generatePageComponent(page) {
        const content = page.content;
        return `import React from 'react';

export default function ${this.componentName(page.name)}() {
  return (
    <div className="page">
      <h1>${page.title || page.name}</h1>
      ${page.description ? `<p>${page.description}</p>` : ''}
      ${this.renderComponents(content)}
    </div>
  );
}`;
    }
    generateComponent(component) {
        const props = component.props;
        const styles = component.styles;
        return `import React from 'react';

interface ${this.componentName(component.name)}Props {
  ${Object.entries(props).map(([key, value]) => `${key}?: ${this.getTypeForValue(value)};`).join('\n  ')}
}

export default function ${this.componentName(component.name)}(props: ${this.componentName(component.name)}Props) {
  return (
    <div style={${JSON.stringify(styles)}}>
      ${this.renderComponentByType(component)}
    </div>
  );
}`;
    }
    renderComponentByType(component) {
        const type = component.type.toLowerCase();
        const props = component.props;
        switch (type) {
            case 'text':
                return `<p>{props.text || 'Text'}</p>`;
            case 'button':
                return `<button onClick={props.onClick}>{props.label || 'Button'}</button>`;
            case 'image':
                return `<img src={props.src || '/placeholder.png'} alt={props.alt || 'Image'} />`;
            case 'container':
                return `<div>{props.children}</div>`;
            default:
                return `<div>Component: ${component.type}</div>`;
        }
    }
    renderComponents(content) {
        if (!content || !content.components) {
            return '<div>No content</div>';
        }
        return content.components.map((comp) => {
            return `<div key="${comp.id}">${comp.type}</div>`;
        }).join('\n      ');
    }
    generateStyles() {
        return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a {
  font-weight: 500;
  color: #646cff;
  text-decoration: inherit;
}
a:hover {
  color: #535bf2;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}

h1 {
  font-size: 3.2em;
  line-height: 1.1;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  cursor: pointer;
  transition: border-color 0.25s;
}
button:hover {
  border-color: #646cff;
}
button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}

@media (prefers-color-scheme: light) {
  :root {
    color: #213547;
    background-color: #ffffff;
  }
  a:hover {
    color: #747bff;
  }
  button {
    background-color: #f9f9f9;
  }
}`;
    }
    generateViteConfig() {
        return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
});`;
    }
    generateTsConfig() {
        return JSON.stringify({
            compilerOptions: {
                target: 'ES2020',
                useDefineForClassFields: true,
                lib: ['ES2020', 'DOM', 'DOM.Iterable'],
                module: 'ESNext',
                skipLibCheck: true,
                moduleResolution: 'bundler',
                allowImportingTsExtensions: true,
                resolveJsonModule: true,
                isolatedModules: true,
                noEmit: true,
                jsx: 'react-jsx',
                strict: true,
                noUnusedLocals: true,
                noUnusedParameters: true,
                noFallthroughCasesInSwitch: true,
            },
            include: ['src'],
            references: [{ path: './tsconfig.node.json' }],
        }, null, 2);
    }
    slugify(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
    componentName(text) {
        return text
            .split(/[^a-zA-Z0-9]+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('');
    }
    getTypeForValue(value) {
        if (typeof value === 'string')
            return 'string';
        if (typeof value === 'number')
            return 'number';
        if (typeof value === 'boolean')
            return 'boolean';
        if (Array.isArray(value))
            return 'any[]';
        if (typeof value === 'object')
            return 'any';
        return 'any';
    }
}
