-- Create backups table
CREATE TABLE IF NOT EXISTS backups (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('full', 'incremental')),
    size BIGINT NOT NULL,
    checksum TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB NOT NULL DEFAULT '{}'
);

-- Create indexes
CREATE INDEX "backups_created_at_idx" ON backups(created_at DESC);
CREATE INDEX "backups_type_idx" ON backups(type);

-- Create backup schedule table
CREATE TABLE IF NOT EXISTS backup_schedules (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    schedule TEXT NOT NULL, -- Cron expression
    type TEXT NOT NULL CHECK (type IN ('full', 'incremental')),
    enabled BOOLEAN NOT NULL DEFAULT true,
    last_run TIMESTAMP(3),
    next_run TIMESTAMP(3),
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create restore jobs table
CREATE TABLE IF NOT EXISTS restore_jobs (
    id TEXT PRIMARY KEY,
    backup_id TEXT NOT NULL,
    target_database TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP(3),
    error TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX "restore_jobs_backup_id_idx" ON restore_jobs(backup_id);
CREATE INDEX "restore_jobs_status_idx" ON restore_jobs(status);

-- Add backup-related permissions
INSERT INTO permissions (name, resource, action, description) VALUES
    ('backup.create', 'backup', 'create', 'Create manual backups'),
    ('backup.read', 'backup', 'read', 'View backup list and details'),
    ('backup.restore', 'backup', 'restore', 'Restore from backups'),
    ('backup.delete', 'backup', 'delete', 'Delete old backups')
ON CONFLICT (name) DO NOTHING;