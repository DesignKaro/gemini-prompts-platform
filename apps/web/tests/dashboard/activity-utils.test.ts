import { buildActivityMessage } from '../../lib/utils/activity';

describe('buildActivityMessage', () => {
  it('builds actor/action/target summary', () => {
    const message = buildActivityMessage({
      action: 'UPDATE',
      targetType: 'PROMPT',
      actor: { name: 'AR Group', email: 'ar@example.com' },
      metadata: { title: 'Growth prompt' },
    });

    expect(message).toContain('AR Group');
    expect(message.toLowerCase()).toContain('update');
    expect(message).toContain('Growth prompt');
  });
});
