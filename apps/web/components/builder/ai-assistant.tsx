'use client';

import { useState } from 'react';
import { useProject } from '@/hooks/use-project';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Zap, FileCode, Bug, Upload, MessageSquare } from 'lucide-react';
import { useCanvasStore } from '@nexus/canvas-engine';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface AIAssistantProps {
  projectId: string;
}

export function AIAssistant({ projectId }: AIAssistantProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');
  const [provider, setProvider] = useState<'openai' | 'anthropic'>('openai');
  
  // Generate component states
  const [componentDescription, setComponentDescription] = useState('');
  
  // Optimize code states
  const [codeToOptimize, setCodeToOptimize] = useState('');
  const [optimizationGoals, setOptimizationGoals] = useState<string[]>([]);
  
  // Screenshot states
  const [screenshotUrl, setScreenshotUrl] = useState('');
  
  // Performance analysis states
  const [codeToAnalyze, setCodeToAnalyze] = useState('');
  
  const { addComponent } = useCanvasStore();

  const handleGenerateComponent = async () => {
    if (!componentDescription.trim()) return;
    
    setLoading(true);
    try {
      const response = await api.post('/ai/generate-component', {
        description: componentDescription,
        projectId,
        provider,
      });
      
      const { component } = response.data;
      
      // Add to canvas
      addComponent(component.type, null, { x: 100, y: 100 });
      
      toast.success('Component generated successfully!');
      setComponentDescription('');
    } catch (error) {
      toast.error('Failed to generate component');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeCode = async () => {
    if (!codeToOptimize.trim() || optimizationGoals.length === 0) return;
    
    setLoading(true);
    try {
      const response = await api.post('/ai/optimize-code', {
        code: codeToOptimize,
        optimizationGoals,
        provider,
      });
      
      setCodeToOptimize(response.data.optimizedCode);
      toast.success('Code optimized successfully!');
    } catch (error) {
      toast.error('Failed to optimize code');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFromScreenshot = async () => {
    if (!screenshotUrl.trim()) return;
    
    setLoading(true);
    try {
      const response = await api.post('/ai/generate-from-screenshot', {
        imageUrl: screenshotUrl,
        projectId,
      });
      
      const { components, layout } = response.data;
      
      // Add components to canvas
      components.forEach((component: any, index: number) => {
        addComponent(component.type, null, { 
          x: 100 + (index * 50), 
          y: 100 + (index * 50) 
        });
      });
      
      toast.success(`Generated ${components.length} components from screenshot!`);
      setScreenshotUrl('');
    } catch (error) {
      toast.error('Failed to generate from screenshot');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzePerformance = async () => {
    if (!codeToAnalyze.trim()) return;
    
    setLoading(true);
    try {
      const response = await api.post('/ai/analyze-performance', {
        code: codeToAnalyze,
        provider,
      });
      
      const { analysis } = response.data;
      
      // Display results
      const message = `
Performance Score: ${analysis.score}/100
Issues Found: ${analysis.issues.length}
${analysis.issues.map((issue: any) => `- Line ${issue.line}: ${issue.issue}`).join('\n')}
      `;
      
      toast.info(message, { duration: 10000 });
    } catch (error) {
      toast.error('Failed to analyze performance');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const optimizationOptions = [
    { value: 'performance', label: 'Performance' },
    { value: 'readability', label: 'Readability' },
    { value: 'size', label: 'Bundle Size' },
    { value: 'security', label: 'Security' },
    { value: 'accessibility', label: 'Accessibility' },
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Assistant
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="optimize">Optimize</TabsTrigger>
            <TabsTrigger value="screenshot">Screenshot</TabsTrigger>
            <TabsTrigger value="analyze">Analyze</TabsTrigger>
          </TabsList>

          <div className="mt-4 mb-4">
            <Label>AI Provider</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI GPT-4</SelectItem>
                <SelectItem value="anthropic">Anthropic Claude</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="generate" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Describe the component you want to create</Label>
              <Textarea
                id="description"
                placeholder="A modern contact form with name, email, and message fields..."
                value={componentDescription}
                onChange={(e) => setComponentDescription(e.target.value)}
                rows={4}
              />
            </div>
            <Button 
              onClick={handleGenerateComponent} 
              disabled={loading || !componentDescription.trim()}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Component
            </Button>
          </TabsContent>

          <TabsContent value="optimize" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code to optimize</Label>
              <Textarea
                id="code"
                placeholder="Paste your code here..."
                value={codeToOptimize}
                onChange={(e) => setCodeToOptimize(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Optimization goals</Label>
              <div className="flex flex-wrap gap-2">
                {optimizationOptions.map((option) => (
                  <Badge
                    key={option.value}
                    variant={optimizationGoals.includes(option.value) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      setOptimizationGoals((prev) =>
                        prev.includes(option.value)
                          ? prev.filter((g) => g !== option.value)
                          : [...prev, option.value]
                      );
                    }}
                  >
                    {option.label}
                  </Badge>
                ))}
              </div>
            </div>
            <Button 
              onClick={handleOptimizeCode} 
              disabled={loading || !codeToOptimize.trim() || optimizationGoals.length === 0}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              Optimize Code
            </Button>
          </TabsContent>

          <TabsContent value="screenshot" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="screenshot">Screenshot URL</Label>
              <Input
                id="screenshot"
                type="url"
                placeholder="https://example.com/design.png"
                value={screenshotUrl}
                onChange={(e) => setScreenshotUrl(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Upload a screenshot of a UI design to generate components
              </p>
            </div>
            <Button 
              onClick={handleGenerateFromScreenshot} 
              disabled={loading || !screenshotUrl.trim()}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Generate from Screenshot
            </Button>
          </TabsContent>

          <TabsContent value="analyze" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="analyze-code">Code to analyze</Label>
              <Textarea
                id="analyze-code"
                placeholder="Paste your React component code here..."
                value={codeToAnalyze}
                onChange={(e) => setCodeToAnalyze(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>
            <Button 
              onClick={handleAnalyzePerformance} 
              disabled={loading || !codeToAnalyze.trim()}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Bug className="mr-2 h-4 w-4" />
              )}
              Analyze Performance
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}