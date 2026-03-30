import { bulkActionMessage, runBulkAction } from '../../app/components/dashboard/bulk-action';

describe('bulk-action helpers', () => {
  it('returns partial failure message with success count', async () => {
    const result = await runBulkAction({
      ids: ['a', 'b', 'c'],
      actionLabel: 'Delete',
      run: async (id) => {
        if (id === 'b') {
          throw new Error('failed b');
        }
      },
    });

    expect(result.total).toBe(3);
    expect(result.successCount).toBe(2);
    expect(result.failureCount).toBe(1);
    expect(bulkActionMessage(result, 'Delete')).toContain('partial failures');
  });
});
