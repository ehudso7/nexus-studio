export const typeDefs = `
  scalar DateTime
  scalar JSON

  type User {
    id: ID!
    email: String!
    name: String
    avatar: String
    role: UserRole!
    plan: PricingPlan!
    planExpiresAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    projects: [Project!]!
    apiKeys: [ApiKey!]!
  }

  type Project {
    id: ID!
    name: String!
    slug: String!
    description: String
    icon: String
    type: ProjectType!
    status: ProjectStatus!
    visibility: ProjectVisibility!
    settings: JSON!
    metadata: JSON!
    owner: User!
    members: [ProjectMember!]!
    pages: [Page!]!
    components: [Component!]!
    assets: [Asset!]!
    deployments: [Deployment!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ProjectMember {
    id: ID!
    user: User!
    role: ProjectRole!
    joinedAt: DateTime!
  }

  type Page {
    id: ID!
    name: String!
    path: String!
    title: String
    description: String
    content: JSON!
    settings: JSON!
    isHomePage: Boolean!
    status: PageStatus!
    seo: PageSeo
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type PageSeo {
    metaTitle: String
    metaDescription: String
    metaKeywords: [String!]!
    ogTitle: String
    ogDescription: String
    ogImage: String
    twitterCard: String
    canonicalUrl: String
    robots: String
  }

  type Component {
    id: ID!
    name: String!
    type: ComponentType!
    category: String!
    props: JSON!
    styles: JSON!
    events: JSON!
    children: JSON!
    isGlobal: Boolean!
    isLocked: Boolean!
    version: String!
    instances: [ComponentInstance!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ComponentInstance {
    id: ID!
    component: Component!
    props: JSON!
    styles: JSON!
    order: Int!
  }

  type Asset {
    id: ID!
    name: String!
    type: AssetType!
    url: String!
    size: Int!
    mimeType: String!
    metadata: JSON!
    uploadedAt: DateTime!
  }

  type Deployment {
    id: ID!
    project: Project!
    user: User!
    version: String!
    environment: DeploymentEnvironment!
    status: DeploymentStatus!
    url: String
    buildLog: String
    error: String
    metadata: JSON!
    startedAt: DateTime!
    completedAt: DateTime
  }

  type ApiKey {
    id: ID!
    name: String!
    key: String!
    permissions: [String!]!
    lastUsedAt: DateTime
    expiresAt: DateTime
    createdAt: DateTime!
  }

  type Analytics {
    pageViews: Int!
    uniqueVisitors: Int!
    averageSessionDuration: Float!
    bounceRate: Float!
    topPages: [PageAnalytics!]!
    topReferrers: [ReferrerAnalytics!]!
  }

  type PageAnalytics {
    path: String!
    views: Int!
    uniqueVisitors: Int!
  }

  type ReferrerAnalytics {
    source: String!
    visits: Int!
  }

  type Plugin {
    id: ID!
    name: String!
    slug: String!
    description: String!
    version: String!
    author: String!
    icon: String
    category: PluginCategory!
    permissions: [String!]!
    config: JSON!
    isPublic: Boolean!
    isVerified: Boolean!
    downloads: Int!
    rating: Float!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Template {
    id: ID!
    name: String!
    slug: String!
    description: String!
    preview: String!
    category: TemplateCategory!
    tags: [String!]!
    config: JSON!
    isPublic: Boolean!
    isFeatured: Boolean!
    uses: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Enums
  enum UserRole {
    USER
    ADMIN
    SUPER_ADMIN
  }

  enum PricingPlan {
    FREE
    STARTER
    PRO
    ENTERPRISE
  }

  enum ProjectType {
    WEB
    MOBILE
    DESKTOP
    API
  }

  enum ProjectStatus {
    DRAFT
    PUBLISHED
    ARCHIVED
  }

  enum ProjectVisibility {
    PRIVATE
    PUBLIC
    UNLISTED
  }

  enum ProjectRole {
    VIEWER
    EDITOR
    ADMIN
    OWNER
  }

  enum PageStatus {
    DRAFT
    PUBLISHED
    ARCHIVED
  }

  enum ComponentType {
    LAYOUT
    FORM
    DATA
    MEDIA
    NAVIGATION
    CUSTOM
  }

  enum AssetType {
    IMAGE
    VIDEO
    AUDIO
    DOCUMENT
    FONT
    OTHER
  }

  enum DeploymentEnvironment {
    DEVELOPMENT
    STAGING
    PRODUCTION
  }

  enum DeploymentStatus {
    PENDING
    BUILDING
    DEPLOYING
    SUCCESS
    FAILED
    CANCELLED
  }

  enum PluginCategory {
    UI_COMPONENT
    DATA_SOURCE
    INTEGRATION
    ANALYTICS
    AUTOMATION
    SECURITY
    OTHER
  }

  enum TemplateCategory {
    LANDING_PAGE
    DASHBOARD
    E_COMMERCE
    BLOG
    PORTFOLIO
    ADMIN
    MOBILE_APP
    OTHER
  }

  # Input Types
  input CreateProjectInput {
    name: String!
    description: String
    type: ProjectType!
    templateId: ID
  }

  input UpdateProjectInput {
    name: String
    description: String
    icon: String
    settings: JSON
    metadata: JSON
  }

  input CreatePageInput {
    projectId: ID!
    name: String!
    path: String!
    title: String
    description: String
    isHomePage: Boolean
  }

  input UpdatePageInput {
    name: String
    title: String
    description: String
    content: JSON
    settings: JSON
    seo: PageSeoInput
  }

  input PageSeoInput {
    metaTitle: String
    metaDescription: String
    metaKeywords: [String!]
    ogTitle: String
    ogDescription: String
    ogImage: String
    twitterCard: String
    canonicalUrl: String
    robots: String
  }

  input CreateComponentInput {
    projectId: ID
    name: String!
    type: ComponentType!
    category: String!
    props: JSON
    styles: JSON
    events: JSON
    isGlobal: Boolean
  }

  input UpdateComponentInput {
    name: String
    props: JSON
    styles: JSON
    events: JSON
    children: JSON
  }

  input CreateDeploymentInput {
    projectId: ID!
    environment: DeploymentEnvironment!
  }

  input CreateApiKeyInput {
    name: String!
    permissions: [String!]!
    expiresAt: DateTime
  }

  # Queries
  type Query {
    # User queries
    me: User
    user(id: ID!): User
    users(limit: Int, offset: Int): [User!]!

    # Project queries
    project(id: ID!): Project
    projectBySlug(slug: String!): Project
    projects(
      ownerId: ID
      status: ProjectStatus
      type: ProjectType
      limit: Int
      offset: Int
    ): [Project!]!
    
    # Page queries
    page(id: ID!): Page
    pages(projectId: ID!): [Page!]!
    
    # Component queries
    component(id: ID!): Component
    components(
      projectId: ID
      type: ComponentType
      isGlobal: Boolean
      limit: Int
      offset: Int
    ): [Component!]!
    
    # Asset queries
    asset(id: ID!): Asset
    assets(projectId: ID!, type: AssetType): [Asset!]!
    
    # Deployment queries
    deployment(id: ID!): Deployment
    deployments(
      projectId: ID
      environment: DeploymentEnvironment
      status: DeploymentStatus
      limit: Int
      offset: Int
    ): [Deployment!]!
    
    # Analytics queries
    analytics(projectId: ID!, timeRange: TimeRange!): Analytics
    
    # Plugin queries
    plugin(id: ID!): Plugin
    plugins(
      category: PluginCategory
      isPublic: Boolean
      search: String
      limit: Int
      offset: Int
    ): [Plugin!]!
    
    # Template queries
    template(id: ID!): Template
    templates(
      category: TemplateCategory
      isFeatured: Boolean
      search: String
      limit: Int
      offset: Int
    ): [Template!]!
  }

  # Mutations
  type Mutation {
    # Project mutations
    createProject(input: CreateProjectInput!): Project!
    updateProject(id: ID!, input: UpdateProjectInput!): Project!
    deleteProject(id: ID!): Boolean!
    publishProject(id: ID!): Project!
    archiveProject(id: ID!): Project!
    
    # Project member mutations
    addProjectMember(projectId: ID!, userId: ID!, role: ProjectRole!): ProjectMember!
    updateProjectMember(projectId: ID!, userId: ID!, role: ProjectRole!): ProjectMember!
    removeProjectMember(projectId: ID!, userId: ID!): Boolean!
    
    # Page mutations
    createPage(input: CreatePageInput!): Page!
    updatePage(id: ID!, input: UpdatePageInput!): Page!
    deletePage(id: ID!): Boolean!
    publishPage(id: ID!): Page!
    
    # Component mutations
    createComponent(input: CreateComponentInput!): Component!
    updateComponent(id: ID!, input: UpdateComponentInput!): Component!
    deleteComponent(id: ID!): Boolean!
    duplicateComponent(id: ID!): Component!
    
    # Asset mutations
    uploadAsset(projectId: ID!, file: Upload!): Asset!
    deleteAsset(id: ID!): Boolean!
    
    # Deployment mutations
    createDeployment(input: CreateDeploymentInput!): Deployment!
    cancelDeployment(id: ID!): Deployment!
    
    # API Key mutations
    createApiKey(input: CreateApiKeyInput!): ApiKey!
    revokeApiKey(id: ID!): Boolean!
    
    # Plugin mutations
    installPlugin(pluginId: ID!, projectId: ID!): Boolean!
    uninstallPlugin(pluginId: ID!, projectId: ID!): Boolean!
    
    # Template mutations
    createProjectFromTemplate(templateId: ID!, name: String!): Project!
  }

  # Subscriptions
  type Subscription {
    # Project subscriptions
    projectUpdated(id: ID!): Project!
    
    # Page subscriptions
    pageUpdated(projectId: ID!): Page!
    
    # Deployment subscriptions
    deploymentStatusChanged(projectId: ID!): Deployment!
    
    # Collaboration subscriptions
    componentUpdated(projectId: ID!): Component!
    userJoinedProject(projectId: ID!): ProjectMember!
    userLeftProject(projectId: ID!): ID!
  }

  # Additional input types
  input TimeRange {
    start: DateTime!
    end: DateTime!
  }

  # File upload scalar
  scalar Upload
`;