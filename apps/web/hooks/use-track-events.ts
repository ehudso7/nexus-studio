import { useAnalytics } from '@/components/analytics-provider';
import { useCallback } from 'react';

export function useTrackEvents() {
  const analytics = useAnalytics();
  
  return {
    // Authentication events
    trackSignUp: useCallback((method: 'email' | 'google' | 'github') => {
      analytics.track('sign_up', { method });
    }, [analytics]),
    
    trackSignIn: useCallback((method: 'email' | 'google' | 'github') => {
      analytics.track('sign_in', { method });
    }, [analytics]),
    
    trackSignOut: useCallback(() => {
      analytics.track('sign_out');
    }, [analytics]),
    
    // Project events
    trackProjectCreated: useCallback((projectType: string, framework: string) => {
      analytics.track('project_created', { projectType, framework });
      analytics.trackConversion('project_creation', 1, { projectType, framework });
    }, [analytics]),
    
    trackProjectOpened: useCallback((projectId: string) => {
      analytics.track('project_opened', { projectId });
    }, [analytics]),
    
    trackProjectDeleted: useCallback((projectId: string) => {
      analytics.track('project_deleted', { projectId });
    }, [analytics]),
    
    trackProjectDeployed: useCallback((projectId: string, provider: string) => {
      analytics.track('project_deployed', { projectId, provider });
      analytics.trackConversion('deployment', 1, { provider });
    }, [analytics]),
    
    // Builder events
    trackComponentAdded: useCallback((componentType: string, method: 'drag' | 'click' | 'ai') => {
      analytics.track('component_added', { componentType, method });
    }, [analytics]),
    
    trackComponentDeleted: useCallback((componentType: string) => {
      analytics.track('component_deleted', { componentType });
    }, [analytics]),
    
    trackCanvasAction: useCallback((action: string) => {
      analytics.trackAction(action, 'canvas');
    }, [analytics]),
    
    // AI events
    trackAIGeneration: useCallback((type: string, success: boolean) => {
      analytics.track('ai_generation', { type, success });
      if (success) {
        analytics.trackConversion('ai_usage', 1, { type });
      }
    }, [analytics]),
    
    trackAIAssistantUsed: useCallback((action: string) => {
      analytics.track('ai_assistant_used', { action });
    }, [analytics]),
    
    // Collaboration events
    trackTeamCreated: useCallback((teamSize: number) => {
      analytics.track('team_created', { teamSize });
      analytics.trackConversion('team_creation', 1, { teamSize });
    }, [analytics]),
    
    trackMemberInvited: useCallback((role: string) => {
      analytics.track('member_invited', { role });
    }, [analytics]),
    
    // Plugin events
    trackPluginInstalled: useCallback((pluginId: string, pluginName: string) => {
      analytics.track('plugin_installed', { pluginId, pluginName });
    }, [analytics]),
    
    trackPluginUninstalled: useCallback((pluginId: string, pluginName: string) => {
      analytics.track('plugin_uninstalled', { pluginId, pluginName });
    }, [analytics]),
    
    // Workflow events
    trackWorkflowCreated: useCallback((trigger: string) => {
      analytics.track('workflow_created', { trigger });
    }, [analytics]),
    
    trackWorkflowExecuted: useCallback((workflowId: string, success: boolean) => {
      analytics.track('workflow_executed', { workflowId, success });
    }, [analytics]),
    
    // Error tracking
    trackError: useCallback((error: Error, context?: Record<string, any>) => {
      analytics.trackError(error, context);
    }, [analytics]),
    
    // Performance tracking
    trackPerformance: useCallback((metric: string, value: number, unit: string) => {
      analytics.track('performance_metric', { metric, value, unit });
    }, [analytics]),
    
    // Feature usage
    trackFeatureUsed: useCallback((feature: string, variant?: string) => {
      analytics.track('feature_used', { feature, variant });
    }, [analytics]),
    
    // Search
    trackSearch: useCallback((query: string, resultCount: number) => {
      analytics.track('search', { query, resultCount });
    }, [analytics]),
  };
}