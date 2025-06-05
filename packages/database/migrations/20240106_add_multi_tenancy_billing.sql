-- Add Organizations table
CREATE TABLE IF NOT EXISTS "Organization" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo TEXT,
    description TEXT,
    website TEXT,
    plan TEXT NOT NULL DEFAULT 'FREE',
    "planLimits" JSONB NOT NULL DEFAULT '{}',
    "stripeCustomerId" TEXT UNIQUE,
    "billingEmail" TEXT,
    "taxId" TEXT,
    settings JSONB NOT NULL DEFAULT '{}',
    features TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3)
);

CREATE INDEX "Organization_slug_idx" ON "Organization"(slug);

-- Add Organization Members
CREATE TABLE IF NOT EXISTS "OrganizationMember" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    role TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationMember_organizationId_userId_key" UNIQUE ("organizationId", "userId")
);

CREATE INDEX "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- Add Organization Invitations
CREATE TABLE IF NOT EXISTS "OrganizationInvitation" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "organizationId" TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "OrganizationInvitation_token_idx" ON "OrganizationInvitation"(token);
CREATE INDEX "OrganizationInvitation_email_idx" ON "OrganizationInvitation"(email);

-- Add Subscription table
CREATE TABLE IF NOT EXISTS "Subscription" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "organizationId" TEXT NOT NULL UNIQUE,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL UNIQUE,
    "stripePriceId" TEXT NOT NULL,
    plan TEXT NOT NULL,
    "billingPeriod" TEXT NOT NULL,
    status TEXT NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    metadata JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Subscription_stripeSubscriptionId_idx" ON "Subscription"("stripeSubscriptionId");

-- Add Payment table
CREATE TABLE IF NOT EXISTS "Payment" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "organizationId" TEXT NOT NULL,
    "stripeInvoiceId" TEXT NOT NULL UNIQUE,
    "stripePaymentIntentId" TEXT,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Payment_organizationId_idx" ON "Payment"("organizationId");
CREATE INDEX "Payment_status_idx" ON "Payment"(status);

-- Add Usage table
CREATE TABLE IF NOT EXISTS "Usage" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "organizationId" TEXT NOT NULL,
    period TIMESTAMP(3) NOT NULL,
    projects INTEGER NOT NULL DEFAULT 0,
    "teamMembers" INTEGER NOT NULL DEFAULT 0,
    storage DOUBLE PRECISION NOT NULL DEFAULT 0,
    deployments INTEGER NOT NULL DEFAULT 0,
    "apiRequests" INTEGER NOT NULL DEFAULT 0,
    "aiRequests" INTEGER NOT NULL DEFAULT 0,
    bandwidth DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customMetrics" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Usage_organizationId_period_key" UNIQUE ("organizationId", period)
);

CREATE INDEX "Usage_organizationId_idx" ON "Usage"("organizationId");
CREATE INDEX "Usage_period_idx" ON "Usage"(period);

-- Add WebhookEvent table
CREATE TABLE IF NOT EXISTS "WebhookEvent" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "stripeEventId" TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT false,
    error TEXT,
    data JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "WebhookEvent_type_idx" ON "WebhookEvent"(type);
CREATE INDEX "WebhookEvent_processed_idx" ON "WebhookEvent"(processed);

-- Add PaymentMethod table
CREATE TABLE IF NOT EXISTS "PaymentMethod" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "stripePaymentMethodId" TEXT NOT NULL UNIQUE,
    "stripeCustomerId" TEXT NOT NULL,
    type TEXT NOT NULL,
    card JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "PaymentMethod_stripeCustomerId_idx" ON "PaymentMethod"("stripeCustomerId");

-- Add SSO Config table
CREATE TABLE IF NOT EXISTS "SSOConfig" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "organizationId" TEXT NOT NULL,
    provider TEXT NOT NULL,
    "entryPoint" TEXT,
    issuer TEXT,
    certificate TEXT,
    "clientId" TEXT,
    "clientSecret" TEXT,
    "discoveryUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SSOConfig_organizationId_provider_key" UNIQUE ("organizationId", provider)
);

-- Add Webhook table
CREATE TABLE IF NOT EXISTS "Webhook" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "organizationId" TEXT NOT NULL,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL,
    secret TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Webhook_organizationId_idx" ON "Webhook"("organizationId");

-- Add Analytics Event table
CREATE TABLE IF NOT EXISTS "AnalyticsEvent" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "organizationId" TEXT,
    "projectId" TEXT,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL DEFAULT '{}',
    "sessionId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    referrer TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "AnalyticsEvent_organizationId_idx" ON "AnalyticsEvent"("organizationId");
CREATE INDEX "AnalyticsEvent_projectId_idx" ON "AnalyticsEvent"("projectId");
CREATE INDEX "AnalyticsEvent_userId_idx" ON "AnalyticsEvent"("userId");
CREATE INDEX "AnalyticsEvent_eventType_idx" ON "AnalyticsEvent"("eventType");
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- Add DataExport table
CREATE TABLE IF NOT EXISTS "DataExport" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    format TEXT NOT NULL,
    "fileUrl" TEXT,
    error TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3)
);

CREATE INDEX "DataExport_organizationId_idx" ON "DataExport"("organizationId");
CREATE INDEX "DataExport_userId_idx" ON "DataExport"("userId");
CREATE INDEX "DataExport_status_idx" ON "DataExport"(status);

-- Update User table
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3),
DROP COLUMN IF EXISTS plan,
DROP COLUMN IF EXISTS "planExpiresAt";

-- Update Project table
ALTER TABLE "Project" 
ADD COLUMN IF NOT EXISTS "organizationId" TEXT,
ADD COLUMN IF NOT EXISTS "customDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN IF EXISTS "customDomain",
ADD CONSTRAINT "Project_organizationId_slug_key" UNIQUE ("organizationId", slug);

CREATE INDEX IF NOT EXISTS "Project_organizationId_idx" ON "Project"("organizationId");

-- Update ApiKey table
ALTER TABLE "ApiKey" 
ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

CREATE INDEX IF NOT EXISTS "ApiKey_organizationId_idx" ON "ApiKey"("organizationId");

-- Update AuditLog table
ALTER TABLE "AuditLog"
ADD COLUMN IF NOT EXISTS "organizationId" TEXT,
ADD COLUMN IF NOT EXISTS "resourceType" TEXT,
ADD COLUMN IF NOT EXISTS "resourceId" TEXT,
DROP COLUMN IF EXISTS entity,
DROP COLUMN IF EXISTS "entityId";

CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");

-- Update Notification table enums
ALTER TABLE "Notification" 
ADD COLUMN IF NOT EXISTS temp_type TEXT;

UPDATE "Notification" SET temp_type = type::TEXT;

ALTER TABLE "Notification" 
DROP COLUMN type,
ADD COLUMN type TEXT;

UPDATE "Notification" SET type = temp_type;

ALTER TABLE "Notification" DROP COLUMN temp_type;

-- Update Deployment table to add size
ALTER TABLE "Deployment"
ADD COLUMN IF NOT EXISTS size INTEGER;

-- Add foreign key constraints
ALTER TABLE "OrganizationMember" 
ADD CONSTRAINT "OrganizationMember_organizationId_fkey" 
FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) ON DELETE CASCADE;

ALTER TABLE "OrganizationMember" 
ADD CONSTRAINT "OrganizationMember_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE;

ALTER TABLE "OrganizationInvitation" 
ADD CONSTRAINT "OrganizationInvitation_organizationId_fkey" 
FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) ON DELETE CASCADE;

ALTER TABLE "Subscription" 
ADD CONSTRAINT "Subscription_organizationId_fkey" 
FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) ON DELETE CASCADE;

ALTER TABLE "Payment" 
ADD CONSTRAINT "Payment_organizationId_fkey" 
FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) ON DELETE CASCADE;

ALTER TABLE "Usage" 
ADD CONSTRAINT "Usage_organizationId_fkey" 
FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) ON DELETE CASCADE;

ALTER TABLE "SSOConfig" 
ADD CONSTRAINT "SSOConfig_organizationId_fkey" 
FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) ON DELETE CASCADE;

ALTER TABLE "Webhook" 
ADD CONSTRAINT "Webhook_organizationId_fkey" 
FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) ON DELETE CASCADE;

ALTER TABLE "Project" 
ADD CONSTRAINT "Project_organizationId_fkey" 
FOREIGN KEY ("organizationId") REFERENCES "Organization"(id);

ALTER TABLE "ApiKey" 
ADD CONSTRAINT "ApiKey_organizationId_fkey" 
FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) ON DELETE CASCADE;

ALTER TABLE "AuditLog" 
ADD CONSTRAINT "AuditLog_organizationId_fkey" 
FOREIGN KEY ("organizationId") REFERENCES "Organization"(id);