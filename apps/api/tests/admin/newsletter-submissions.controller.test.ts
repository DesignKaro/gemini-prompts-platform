import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('NewsletterController permissions', () => {
  it('uses activity:read permission on list route', () => {
    const filePath = path.resolve(
      __dirname,
      '../../src/modules/admin/newsletter/newsletter.controller.ts',
    );
    const content = readFileSync(filePath, 'utf8');

    expect(content).toContain("@Permissions('activity:read')");
  });
});
