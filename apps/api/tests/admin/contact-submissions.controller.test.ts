import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('ContactSubmissionsController permissions', () => {
  it('uses contacts:read and contacts:manage permissions', () => {
    const filePath = path.resolve(
      __dirname,
      '../../src/modules/admin/contact-submissions/contact-submissions.controller.ts',
    );
    const content = readFileSync(filePath, 'utf8');

    expect(content).toContain("@Permissions('contacts:read')");
    expect(content).toContain("@Permissions('contacts:manage')");
  });
});
