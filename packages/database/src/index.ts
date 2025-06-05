export * from '@prisma/client';
export { PrismaClient } from '@prisma/client';
export { AuditLogger } from './audit-logger';
export type { AuditContext, AuditEvent } from './audit-logger';
export { DataExporter, DataImporter } from './data-export';
export type { ExportOptions, ExportFormat, ExportType } from './data-export';

import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}