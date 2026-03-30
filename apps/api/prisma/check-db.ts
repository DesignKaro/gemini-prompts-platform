import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const REQUIRED_TABLES = ['User', 'AuthAccount', 'PasswordCredential', 'RefreshToken'] as const;
const DASHBOARD_TABLES = [
  'Post',
  'Comment',
  'MediaAsset',
  'MediaUsage',
  'AuditLog',
  'Transaction',
  '_PostTags',
  '_PostCategories',
] as const;
const DASHBOARD_COLUMNS: Record<string, string[]> = {
  Category: [
    'parentId',
    'description',
    'imageUrl',
    'colorConfig',
    'sortOrder',
    'updatedAt',
    'deletedAt',
  ],
  Tag: ['color', 'updatedAt', 'deletedAt'],
  Prompt: [
    'seoTitle',
    'seoDescription',
    'primaryCategoryId',
    'scheduledAt',
    'deletedAt',
    'viewCount',
    'likeCount',
    'saveCount',
  ],
};

async function main() {
  await prisma.$queryRaw`SELECT 1 as ok`;

  const rows = await prisma.$queryRaw<Array<{ tableName: string }>>`
    SELECT table_name as tableName
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
  `;

  const existing = new Set(rows.map((row) => row.tableName.toLowerCase()));
  const missingCore = REQUIRED_TABLES.filter((table) => !existing.has(table.toLowerCase()));
  if (missingCore.length > 0) {
    throw new Error(
      `Database connected, but required tables are missing: ${missingCore.join(
        ', ',
      )}. Apply db/migrations/0001_init.sql and db/migrations/0002_auth.sql.`,
    );
  }

  const missingDashboardTables = DASHBOARD_TABLES.filter(
    (table) => !existing.has(table.toLowerCase()),
  );

  const postCategoryForeignKeys = await prisma.$queryRaw<
    Array<{ columnName: string; referencedTableName: string }>
  >`
    SELECT column_name as columnName, referenced_table_name as referencedTableName
    FROM information_schema.key_column_usage
    WHERE table_schema = DATABASE()
      AND table_name = '_PostCategories'
      AND column_name IN ('A', 'B')
      AND referenced_table_name IS NOT NULL
  `;

  const postCategoryFkMap = new Map<string, string>();
  for (const row of postCategoryForeignKeys) {
    postCategoryFkMap.set(row.columnName, row.referencedTableName);
  }

  const columnRows = await prisma.$queryRaw<Array<{ tableName: string; columnName: string }>>`
    SELECT table_name as tableName, column_name as columnName
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name IN ('Category', 'Tag', 'Prompt')
  `;

  const columnsByTable = new Map<string, Set<string>>();
  for (const row of columnRows) {
    const key = row.tableName;
    if (!columnsByTable.has(key)) {
      columnsByTable.set(key, new Set());
    }
    columnsByTable.get(key)?.add(row.columnName);
  }

  const missingDashboardColumns: string[] = [];
  for (const [table, columns] of Object.entries(DASHBOARD_COLUMNS)) {
    const existingColumns = columnsByTable.get(table) ?? new Set<string>();
    for (const column of columns) {
      if (!existingColumns.has(column)) {
        missingDashboardColumns.push(`${table}.${column}`);
      }
    }
  }

  if (missingDashboardTables.length > 0 || missingDashboardColumns.length > 0) {
    throw new Error(
      `Dashboard migration pending. Missing tables: ${
        missingDashboardTables.length ? missingDashboardTables.join(', ') : 'none'
      }. Missing columns: ${
        missingDashboardColumns.length ? missingDashboardColumns.join(', ') : 'none'
      }. Apply db/migrations/0007_dashboard.sql or run "npm run db:migrate:dashboard -w @gemini-prompts/api".`,
    );
  }

  if (postCategoryFkMap.get('A') !== 'Category' || postCategoryFkMap.get('B') !== 'Post') {
    throw new Error(
      `Dashboard migration integrity issue detected: _PostCategories foreign keys must be A->Category and B->Post (found A->${postCategoryFkMap.get('A') ?? 'null'}, B->${postCategoryFkMap.get('B') ?? 'null'}). Run "npm run db:integrity:repair -w @gemini-prompts/api" to auto-repair.`,
    );
  }

  console.log('Database check passed.');
  console.log(`Found required tables: ${REQUIRED_TABLES.join(', ')}`);
  console.log('Dashboard tables and columns look up to date.');
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Database check failed: ${message}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
