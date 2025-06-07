export * from '@prisma/client';
export { PrismaClient } from '@prisma/client';
export { AuditLogger } from './audit-logger';
export { DataExporter, DataImporter } from './data-export';
import { PrismaClient } from '@prisma/client';
export const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}
