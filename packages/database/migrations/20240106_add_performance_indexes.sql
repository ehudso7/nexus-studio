-- Performance indexes for Nexus Studio

-- User indexes
CREATE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_user_created_at ON "User"("createdAt" DESC);

-- Project indexes
CREATE INDEX idx_project_user_id ON "Project"("userId");
CREATE INDEX idx_project_team_id ON "Project"("teamId");
CREATE INDEX idx_project_created_at ON "Project"("createdAt" DESC);
CREATE INDEX idx_project_updated_at ON "Project"("updatedAt" DESC);
CREATE INDEX idx_project_is_public ON "Project"("isPublic") WHERE "isPublic" = true;
CREATE INDEX idx_project_deleted_at ON "Project"("deletedAt") WHERE "deletedAt" IS NOT NULL;
CREATE INDEX idx_project_user_id_name ON "Project"("userId", name);

-- Component indexes
CREATE INDEX idx_component_project_id ON "Component"("projectId");
CREATE INDEX idx_component_parent_id ON "Component"("parentId");
CREATE INDEX idx_component_type ON "Component"(type);
CREATE INDEX idx_component_project_parent ON "Component"("projectId", "parentId");
CREATE INDEX idx_component_created_at ON "Component"("createdAt" DESC);

-- Version indexes
CREATE INDEX idx_version_project_id ON "Version"("projectId");
CREATE INDEX idx_version_created_at ON "Version"("createdAt" DESC);
CREATE INDEX idx_version_project_version ON "Version"("projectId", version);

-- Team indexes
CREATE INDEX idx_team_created_at ON "Team"("createdAt" DESC);

-- TeamMember indexes
CREATE INDEX idx_team_member_user_id ON "TeamMember"("userId");
CREATE INDEX idx_team_member_team_id ON "TeamMember"("teamId");
CREATE INDEX idx_team_member_role ON "TeamMember"(role);
CREATE INDEX idx_team_member_team_user ON "TeamMember"("teamId", "userId");

-- Asset indexes
CREATE INDEX idx_asset_project_id ON "Asset"("projectId");
CREATE INDEX idx_asset_type ON "Asset"(type);
CREATE INDEX idx_asset_created_at ON "Asset"("createdAt" DESC);

-- Analytics indexes
CREATE INDEX idx_analytics_project_id ON "Analytics"("projectId");
CREATE INDEX idx_analytics_user_id ON "Analytics"("userId");
CREATE INDEX idx_analytics_event ON "Analytics"(event);
CREATE INDEX idx_analytics_created_at ON "Analytics"("createdAt" DESC);
CREATE INDEX idx_analytics_project_event ON "Analytics"("projectId", event);
CREATE INDEX idx_analytics_user_event ON "Analytics"("userId", event);

-- Plugin indexes
CREATE INDEX idx_plugin_is_public ON "Plugin"("isPublic") WHERE "isPublic" = true;
CREATE INDEX idx_plugin_category ON "Plugin"(category);
CREATE INDEX idx_plugin_created_at ON "Plugin"("createdAt" DESC);

-- PluginInstallation indexes
CREATE INDEX idx_plugin_install_plugin_id ON "PluginInstallation"("pluginId");
CREATE INDEX idx_plugin_install_project_id ON "PluginInstallation"("projectId");
CREATE INDEX idx_plugin_install_user_id ON "PluginInstallation"("userId");

-- Workflow indexes
CREATE INDEX idx_workflow_project_id ON "Workflow"("projectId");
CREATE INDEX idx_workflow_is_active ON "Workflow"("isActive") WHERE "isActive" = true;
CREATE INDEX idx_workflow_created_at ON "Workflow"("createdAt" DESC);

-- WorkflowRun indexes
CREATE INDEX idx_workflow_run_workflow_id ON "WorkflowRun"("workflowId");
CREATE INDEX idx_workflow_run_status ON "WorkflowRun"(status);
CREATE INDEX idx_workflow_run_started_at ON "WorkflowRun"("startedAt" DESC);
CREATE INDEX idx_workflow_run_workflow_status ON "WorkflowRun"("workflowId", status);

-- Deployment indexes
CREATE INDEX idx_deployment_project_id ON "Deployment"("projectId");
CREATE INDEX idx_deployment_environment ON "Deployment"(environment);
CREATE INDEX idx_deployment_status ON "Deployment"(status);
CREATE INDEX idx_deployment_created_at ON "Deployment"("createdAt" DESC);
CREATE INDEX idx_deployment_project_env ON "Deployment"("projectId", environment);

-- ApiKey indexes
CREATE INDEX idx_api_key_user_id ON "ApiKey"("userId");
CREATE INDEX idx_api_key_project_id ON "ApiKey"("projectId");
CREATE INDEX idx_api_key_last_used ON "ApiKey"("lastUsedAt" DESC) WHERE "lastUsedAt" IS NOT NULL;
CREATE INDEX idx_api_key_expires_at ON "ApiKey"("expiresAt") WHERE "expiresAt" IS NOT NULL;

-- Full text search indexes (PostgreSQL specific)
CREATE INDEX idx_project_search ON "Project" USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_component_search ON "Component" USING gin(to_tsvector('english', name));
CREATE INDEX idx_plugin_search ON "Plugin" USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Composite indexes for common queries
CREATE INDEX idx_project_user_deleted ON "Project"("userId", "deletedAt");
CREATE INDEX idx_component_project_type ON "Component"("projectId", type);
CREATE INDEX idx_analytics_date_range ON "Analytics"("projectId", "createdAt");

-- Partial indexes for performance
CREATE INDEX idx_active_workflows ON "Workflow"("projectId") WHERE "isActive" = true;
CREATE INDEX idx_pending_deployments ON "Deployment"("projectId") WHERE status = 'pending';
CREATE INDEX idx_failed_deployments ON "Deployment"("projectId") WHERE status = 'failed';

-- JSON indexes (for metadata fields)
CREATE INDEX idx_project_metadata ON "Project" USING gin(metadata);
CREATE INDEX idx_component_props ON "Component" USING gin(props);
CREATE INDEX idx_workflow_config ON "Workflow" USING gin(config);

-- Statistics update for query planner
ANALYZE;