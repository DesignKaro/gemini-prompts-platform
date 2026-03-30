import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Contact submissions RBAC migration', () => {
  it('grants contact permissions to SUPERADMIN and ADMIN', () => {
    const migrationPath = path.resolve(
      __dirname,
      '../../../../db/migrations/0033_contact_submissions.sql',
    );
    const content = readFileSync(migrationPath, 'utf8');

    expect(content).toContain("'contacts:read'");
    expect(content).toContain("'contacts:manage'");
    expect(content).toContain("WHERE r.name IN ('SUPERADMIN', 'ADMIN')");
  });
});
