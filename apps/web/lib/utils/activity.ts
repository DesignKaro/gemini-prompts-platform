type ActivityLogLike = {
  action: string;
  targetType: string;
  metadata?: Record<string, unknown> | null;
  actor?: { name: string | null; email: string | null } | null;
};

export function buildActivityMessage(item: ActivityLogLike): string {
  const label =
    (item.metadata?.title as string | undefined) ||
    (item.metadata?.name as string | undefined) ||
    item.targetType?.toLowerCase();
  const actorName = item.actor?.name || item.actor?.email || 'Someone';
  return `${actorName} ${item.action.toLowerCase()} ${label ?? item.targetType.toLowerCase()}`;
}
