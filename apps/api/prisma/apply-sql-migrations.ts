import { readdir, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const MIGRATIONS_DIR = resolve(__dirname, '../../../db/migrations');

const IGNORABLE_PHRASES = [
  'already exists',
  'Duplicate column name',
  'Duplicate key name',
  'Duplicate foreign key constraint name',
  'exists',
];

function isIgnorableError(error: unknown): boolean {
  if (error instanceof Error) {
    return IGNORABLE_PHRASES.some((phrase) => error.message.includes(phrase));
  }
  return false;
}

function stripSqlComments(sql: string): string {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
}

function splitStatements(sql: string): string[] {
  return sql
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

function expandAlterStatements(statements: string[]): string[] {
  const expanded: string[] = [];

  for (const statement of statements) {
    const match = statement.match(/^ALTER TABLE\s+`?([A-Za-z0-9_]+)`?/i);
    if (!match) {
      expanded.push(statement);
      continue;
    }

    const table = match[1];
    const rest = statement.replace(/^ALTER TABLE\s+`?[A-Za-z0-9_]+`?/i, '').trim();
    if (!rest.toUpperCase().startsWith('ADD COLUMN')) {
      expanded.push(statement);
      continue;
    }

    const parts = rest
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    if (parts.length <= 1) {
      expanded.push(statement);
      continue;
    }

    for (const part of parts) {
      expanded.push(`ALTER TABLE \`${table}\` ${part}`);
    }
  }

  return expanded;
}

type SchemaState = {
  tables: Set<string>;
  columns: Map<string, Set<string>>;
  indexes: Map<string, Set<string>>;
  constraints: Map<string, Set<string>>;
};

function normalizeName(name: string | null | undefined): string {
  return (name ?? '').toLowerCase();
}

async function loadSchemaState(): Promise<SchemaState> {
  const [tableRows, columnRows, indexRows, constraintRows] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{ tableName: string }>>(
      'SELECT table_name as tableName FROM information_schema.tables WHERE table_schema = DATABASE()',
    ),
    prisma.$queryRawUnsafe<Array<{ tableName: string; columnName: string }>>(
      'SELECT table_name as tableName, column_name as columnName FROM information_schema.columns WHERE table_schema = DATABASE()',
    ),
    prisma.$queryRawUnsafe<Array<{ tableName: string; indexName: string }>>(
      'SELECT table_name as tableName, index_name as indexName FROM information_schema.statistics WHERE table_schema = DATABASE()',
    ),
    prisma.$queryRawUnsafe<Array<{ tableName: string; constraintName: string }>>(
      'SELECT table_name as tableName, constraint_name as constraintName FROM information_schema.table_constraints WHERE table_schema = DATABASE()',
    ),
  ]);

  const tables = new Set(tableRows.map((row) => normalizeName(row.tableName)));
  const columns = new Map<string, Set<string>>();
  const indexes = new Map<string, Set<string>>();
  const constraints = new Map<string, Set<string>>();

  for (const row of columnRows) {
    const table = normalizeName(row.tableName);
    const column = normalizeName(row.columnName);
    if (!columns.has(table)) {
      columns.set(table, new Set());
    }
    columns.get(table)?.add(column);
  }

  for (const row of indexRows) {
    const table = normalizeName(row.tableName);
    const index = normalizeName(row.indexName);
    if (!indexes.has(table)) {
      indexes.set(table, new Set());
    }
    indexes.get(table)?.add(index);
  }

  for (const row of constraintRows) {
    const table = normalizeName(row.tableName);
    const constraint = normalizeName(row.constraintName);
    if (!constraints.has(table)) {
      constraints.set(table, new Set());
    }
    constraints.get(table)?.add(constraint);
  }

  return { tables, columns, indexes, constraints };
}

function ensureSet(map: Map<string, Set<string>>, key: string): Set<string> {
  if (!map.has(key)) {
    map.set(key, new Set());
  }
  return map.get(key)!;
}

function shouldSkipStatement(statement: string, schema: SchemaState): boolean {
  const createTable = statement.match(/^CREATE TABLE\s+`?([A-Za-z0-9_]+)`?/i);
  if (createTable) {
    return schema.tables.has(normalizeName(createTable[1]));
  }

  const addColumn = statement.match(
    /^ALTER TABLE\s+`?([A-Za-z0-9_]+)`?\s+ADD COLUMN\s+`?([A-Za-z0-9_]+)`?/i,
  );
  if (addColumn) {
    const table = normalizeName(addColumn[1]);
    const column = normalizeName(addColumn[2]);
    return (schema.columns.get(table) ?? new Set()).has(column);
  }

  const createIndex = statement.match(
    /^CREATE INDEX\s+`?([A-Za-z0-9_]+)`?\s+ON\s+`?([A-Za-z0-9_]+)`?/i,
  );
  if (createIndex) {
    const index = normalizeName(createIndex[1]);
    const table = normalizeName(createIndex[2]);
    return (schema.indexes.get(table) ?? new Set()).has(index);
  }

  const addConstraint = statement.match(
    /^ALTER TABLE\s+`?([A-Za-z0-9_]+)`?\s+ADD CONSTRAINT\s+`?([A-Za-z0-9_]+)`?/i,
  );
  if (addConstraint) {
    const table = normalizeName(addConstraint[1]);
    const constraint = normalizeName(addConstraint[2]);
    return (schema.constraints.get(table) ?? new Set()).has(constraint);
  }

  return false;
}

function applyStatementToSchema(statement: string, schema: SchemaState): void {
  const createTable = statement.match(/^CREATE TABLE\s+`?([A-Za-z0-9_]+)`?/i);
  if (createTable) {
    schema.tables.add(normalizeName(createTable[1]));
    return;
  }

  const addColumn = statement.match(
    /^ALTER TABLE\s+`?([A-Za-z0-9_]+)`?\s+ADD COLUMN\s+`?([A-Za-z0-9_]+)`?/i,
  );
  if (addColumn) {
    const table = normalizeName(addColumn[1]);
    const column = normalizeName(addColumn[2]);
    ensureSet(schema.columns, table).add(column);
    return;
  }

  const createIndex = statement.match(
    /^CREATE INDEX\s+`?([A-Za-z0-9_]+)`?\s+ON\s+`?([A-Za-z0-9_]+)`?/i,
  );
  if (createIndex) {
    const index = normalizeName(createIndex[1]);
    const table = normalizeName(createIndex[2]);
    ensureSet(schema.indexes, table).add(index);
    return;
  }

  const addConstraint = statement.match(
    /^ALTER TABLE\s+`?([A-Za-z0-9_]+)`?\s+ADD CONSTRAINT\s+`?([A-Za-z0-9_]+)`?/i,
  );
  if (addConstraint) {
    const table = normalizeName(addConstraint[1]);
    const constraint = normalizeName(addConstraint[2]);
    ensureSet(schema.constraints, table).add(constraint);
  }
}

async function ensurePostColumnsAndIndexes(schema: SchemaState): Promise<void> {
  const table = normalizeName('Post');
  if (!schema.tables.has(table)) {
    return;
  }

  const columnDefinitions: Record<string, string> = {
    postType: "ENUM('POST', 'PROMPT') NOT NULL DEFAULT 'POST'",
    postFormat: "ENUM('STANDARD', 'CHECKLIST', 'GALLERY') NOT NULL DEFAULT 'STANDARD'",
    seoTitle: 'VARCHAR(191) NULL',
    seoDescription: 'VARCHAR(512) NULL',
    primaryCategoryId: 'VARCHAR(191) NULL',
    scheduledAt: 'DATETIME(3) NULL',
    deletedAt: 'DATETIME(3) NULL',
    viewCount: 'INTEGER NOT NULL DEFAULT 0',
    commentCount: 'INTEGER NOT NULL DEFAULT 0',
  };

  const existingColumns = schema.columns.get(table) ?? new Set<string>();
  for (const [column, definition] of Object.entries(columnDefinitions)) {
    const normalized = normalizeName(column);
    if (existingColumns.has(normalized)) {
      continue;
    }
    await prisma.$executeRawUnsafe(`ALTER TABLE \`Post\` ADD COLUMN \`${column}\` ${definition}`);
    ensureSet(schema.columns, table).add(normalized);
  }

  const indexDefinitions = [
    {
      name: 'Post_slug_key',
      sql: 'CREATE UNIQUE INDEX `Post_slug_key` ON `Post`(`slug`)',
    },
    {
      name: 'Post_status_visibility_idx',
      sql: 'CREATE INDEX `Post_status_visibility_idx` ON `Post`(`status`, `visibility`)',
    },
    {
      name: 'Post_publishedAt_idx',
      sql: 'CREATE INDEX `Post_publishedAt_idx` ON `Post`(`publishedAt`)',
    },
    {
      name: 'Post_deletedAt_idx',
      sql: 'CREATE INDEX `Post_deletedAt_idx` ON `Post`(`deletedAt`)',
    },
  ];

  const existingIndexes = schema.indexes.get(table) ?? new Set<string>();
  for (const { name, sql } of indexDefinitions) {
    const normalized = normalizeName(name);
    if (existingIndexes.has(normalized)) {
      continue;
    }
    await prisma.$executeRawUnsafe(sql);
    ensureSet(schema.indexes, table).add(normalized);
  }
}

async function main(): Promise<void> {
  const files = (await readdir(MIGRATIONS_DIR))
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    console.log('No SQL migrations found.');
    return;
  }

  const schema = await loadSchemaState();
  let totalApplied = 0;
  let totalSkipped = 0;

  for (const file of files) {
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    const statements = expandAlterStatements(splitStatements(stripSqlComments(sql)));

    if (file.includes('0007_dashboard.sql')) {
      await ensurePostColumnsAndIndexes(schema);
    }

    let applied = 0;
    let skipped = 0;

    for (const statement of statements) {
      if (shouldSkipStatement(statement, schema)) {
        skipped += 1;
        continue;
      }

      try {
        await prisma.$executeRawUnsafe(statement);
        applied += 1;
        applyStatementToSchema(statement, schema);
      } catch (error) {
        if (isIgnorableError(error)) {
          skipped += 1;
          continue;
        }
        throw error;
      }
    }

    totalApplied += applied;
    totalSkipped += skipped;
    console.log(`${file}: applied ${applied}, skipped ${skipped}.`);
  }

  console.log(`All migrations complete. Applied ${totalApplied}, skipped ${totalSkipped}.`);
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Migration run failed: ${message}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
