'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  MdVisibility,
  MdGroup,
  MdAdd,
  MdArticle,
  MdChatBubbleOutline,
  MdArrowForward,
  MdCheckCircle,
  MdChatBubble,
  MdAutoAwesome,
  MdMenuBook,
} from 'react-icons/md';
import { StatCard } from '../components/dashboard/stat-card';
import Link from 'next/link';
import { useAdminApi } from '../components/dashboard/use-admin-api';
import { ActionError } from '../components/dashboard/action-error';
import { formatRelativeTimeOrDash, titleCase } from '../../lib/utils/format';
import { hasAnyPermission } from '../../lib/utils/permissions';

function useDisplayName() {
  const { data: session, status } = useSession();
  const { request } = useAdminApi();
  const [nameFromApi, setNameFromApi] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;

    let isActive = true;
    request<{ user?: { name?: string | null } }>('/api/auth/profile/summary', {
      actionName: 'dashboard.profile.summary.read',
    })
      .then((payload: { user?: { name?: string | null } } | null) => {
        if (!isActive || !payload?.user) return;
        setNameFromApi(payload.user.name ?? null);
      })
      .catch((error: unknown) => {
        if (!isActive || process.env.NODE_ENV === 'production') return;
        console.warn('[dashboard.profile.summary.read] failed', error);
      });
    return () => {
      isActive = false;
    };
  }, [request, status]);

  return (
    nameFromApi?.trim() ||
    session?.user?.name?.trim() ||
    session?.user?.email?.split('@')[0] ||
    'there'
  );
}

type AnalyticsOverview = {
  totals: {
    prompts: number;
    posts: number;
    users: number;
    comments: number;
    promptViews: number;
    postViews: number;
    revenue: number;
    newUsers: number;
  };
};

type ActivityItem = {
  id: string;
  action: string;
  targetType: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
};

type ActivityResponse = {
  items: ActivityItem[];
  total: number;
};

export default function DashboardPage() {
  const displayName = useDisplayName();
  const { request, status: authStatus, session } = useAdminApi();
  const [exportDone, setExportDone] = useState(false);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const canViewAnalytics = hasAnyPermission(session, ['analytics:read']);
  const canViewActivity = hasAnyPermission(session, ['activity:read']);
  const canViewPrompts = hasAnyPermission(session, ['prompts:read', 'prompts:manage']);
  const canViewPosts = hasAnyPermission(session, ['posts:read', 'posts:manage']);
  const canCreateContent = hasAnyPermission(session, ['prompts:manage', 'posts:manage']);
  const canViewComments = hasAnyPermission(session, ['comments:read', 'comments:moderate']);
  const canViewUsers = hasAnyPermission(session, ['users:read', 'users:manage']);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    if (!canViewAnalytics && !canViewActivity) {
      setOverview(null);
      setActivityItems([]);
      setLoadError(null);
      setIsLoading(false);
      return;
    }
    let isActive = true;
    setIsLoading(true);
    setLoadError(null);

    Promise.all([
      canViewAnalytics
        ? request<AnalyticsOverview>('/api/admin/analytics?range=30', {
            actionName: 'dashboard.analytics.read',
          })
        : Promise.resolve(null),
      canViewActivity
        ? request<ActivityResponse>('/api/admin/activity?take=5', {
            actionName: 'dashboard.activity.list',
          })
        : Promise.resolve(null),
    ])
      .then(([overviewPayload, activityPayload]) => {
        if (!isActive) return;
        setOverview(overviewPayload);
        setActivityItems(activityPayload?.items ?? []);
      })
      .catch((err: Error) => {
        if (!isActive) return;
        setLoadError(err.message || 'Unable to load dashboard data.');
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [authStatus, canViewActivity, canViewAnalytics, request]);

  const recentActivity = useMemo(() => {
    const actionLabel = (action: string) => {
      if (action === 'CREATE') return 'Created';
      if (action === 'UPDATE') return 'Updated';
      if (action === 'DELETE') return 'Deleted';
      if (action === 'RESTORE') return 'Restored';
      if (action === 'PUBLISH') return 'Published';
      if (action === 'UNPUBLISH') return 'Unpublished';
      if (action === 'ARCHIVE') return 'Archived';
      return titleCase(action);
    };

    const targetLabel = (target: string) => titleCase(target);

    const iconForTarget = (target: string) => {
      switch (target) {
        case 'PROMPT':
          return { icon: <MdAutoAwesome size={15} />, color: 'bg-[#d5ea52] text-[#0f1116]' };
        case 'POST':
          return { icon: <MdArticle size={15} />, color: 'bg-purple-100 text-purple-700' };
        case 'COMMENT':
          return { icon: <MdChatBubble size={15} />, color: 'bg-blue-100 text-blue-700' };
        case 'USER':
          return { icon: <MdGroup size={15} />, color: 'bg-orange-100 text-orange-700' };
        case 'TAG':
          return { icon: <MdCheckCircle size={15} />, color: 'bg-green-100 text-green-700' };
        case 'CATEGORY':
          return { icon: <MdMenuBook size={15} />, color: 'bg-amber-100 text-amber-700' };
        case 'MEDIA':
          return { icon: <MdVisibility size={15} />, color: 'bg-teal-100 text-teal-700' };
        default:
          return { icon: <MdCheckCircle size={15} />, color: 'bg-gray-100 text-gray-600' };
      }
    };

    return activityItems.map((item) => {
      const name =
        item.metadata?.title ||
        item.metadata?.name ||
        item.metadata?.email ||
        item.metadata?.slug ||
        null;
      const message = name
        ? `${actionLabel(item.action)} ${targetLabel(item.targetType)} "${name}"`
        : `${actionLabel(item.action)} ${targetLabel(item.targetType)}`;
      const iconMeta = iconForTarget(item.targetType);
      return {
        id: item.id,
        message,
        time: formatRelativeTimeOrDash(item.createdAt),
        ...iconMeta,
      };
    });
  }, [activityItems]);

  const totals = overview?.totals;
  const formatValue = (value?: number) => (value ?? 0).toLocaleString();
  const quickLinks = [
    ...(canCreateContent
      ? [
          {
            href: '/dashboard/content/new',
            title: 'Create content',
            description: 'Open the editor and publish a new prompt or post.',
            icon: <MdAdd size={18} />,
          },
        ]
      : []),
    ...(canViewPrompts
      ? [
          {
            href: '/dashboard/content/prompts',
            title: 'Manage prompts',
            description: 'Review prompt drafts, live content, and performance.',
            icon: <MdAutoAwesome size={18} />,
          },
        ]
      : []),
    ...(canViewPosts
      ? [
          {
            href: '/dashboard/content/posts',
            title: 'Manage posts',
            description: 'Edit articles, newsletters, and other long-form content.',
            icon: <MdArticle size={18} />,
          },
        ]
      : []),
    ...(canViewComments
      ? [
          {
            href: '/dashboard/comments',
            title: 'Moderate comments',
            description: 'Approve, review, and clean up community discussions.',
            icon: <MdChatBubble size={18} />,
          },
        ]
      : []),
    ...(canViewUsers
      ? [
          {
            href: '/dashboard/users',
            title: 'Manage users',
            description: 'Review accounts, plans, and access levels.',
            icon: <MdGroup size={18} />,
          },
        ]
      : []),
    ...(canViewAnalytics
      ? [
          {
            href: '/dashboard/analytics',
            title: 'Open analytics',
            description: 'Track views, growth, and publishing momentum.',
            icon: <MdVisibility size={18} />,
          },
        ]
      : []),
  ];

  const handleExport = () => {
    const data = {
      exported_at: new Date().toISOString(),
      overview,
      recentActivity: recentActivity.map((item) => ({
        id: item.id,
        message: item.message,
        time: item.time,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dashboard-export.json';
    a.click();
    URL.revokeObjectURL(url);
    setExportDone(true);
    setTimeout(() => setExportDone(false), 2500);
  };

  return (
    <div className="space-y-8">
      {/* Welcome row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.8rem] font-medium tracking-tight text-[#0f1116] sm:text-[2.2rem]">
            Welcome Back, {displayName}!
          </h1>
          <p className="text-[0.95rem] text-gray-500">
            Here's what's happening with your prompts today.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canViewAnalytics || canViewActivity ? (
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[0.85rem] font-medium text-[#0f1116] border border-[#eef2f6] shadow-sm hover:bg-gray-50 transition-colors"
            >
              {exportDone ? 'Exported!' : 'Quick Export'}
            </button>
          ) : null}
          {canCreateContent ? (
            <Link
              href="/dashboard/content/new"
              className="flex items-center gap-2 rounded-xl bg-[#d5ea52] px-4 py-2.5 text-[0.85rem] font-medium text-[#0f1116] shadow-sm hover:opacity-90 transition-opacity"
            >
              <MdAdd size={18} />
              Create
            </Link>
          ) : null}
        </div>
      </div>

      {loadError && <ActionError error={loadError} />}

      {quickLinks.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[24px] border border-[#eef2f6] bg-white p-5 shadow-sm transition-colors hover:border-[#d7deea] hover:bg-[#fbfcff]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f6fb] text-[#0f1116]">
                {item.icon}
              </div>
              <h2 className="mt-4 text-[1rem] font-medium text-[#0f1116]">{item.title}</h2>
              <p className="mt-2 text-[0.88rem] leading-6 text-[#667080]">{item.description}</p>
            </Link>
          ))}
        </div>
      ) : null}

      {canViewAnalytics ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/dashboard/analytics" className="block">
              <StatCard
                title="Followers"
                value={formatValue(totals?.users)}
                trend={{ value: totals ? `${formatValue(totals.newUsers)} new` : '—', isUp: true }}
                icon={<MdGroup size={20} />}
                color="blue"
              />
            </Link>
            <Link href="/dashboard/content/prompts" className="block">
              <StatCard
                title="Prompts"
                value={formatValue(totals?.prompts)}
                trend={{
                  value: totals ? `${formatValue(totals.promptViews)} views` : '—',
                  isUp: true,
                }}
                icon={<MdAutoAwesome size={20} />}
                color="lime"
              />
            </Link>
            <Link href="/dashboard/content/posts" className="block">
              <StatCard
                title="Blogs"
                value={formatValue(totals?.posts)}
                trend={{
                  value: totals ? `${formatValue(totals.postViews)} views` : '—',
                  isUp: true,
                }}
                icon={<MdArticle size={20} />}
                color="purple"
              />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/dashboard/comments" className="block">
              <StatCard
                title="Comments"
                value={formatValue(totals?.comments)}
                trend={{
                  value: totals ? `${formatValue(totals.comments)} total` : '—',
                  isUp: true,
                }}
                icon={<MdChatBubbleOutline size={20} />}
                color="orange"
              />
            </Link>
            <Link href="/dashboard/analytics" className="block">
              <StatCard
                title="Views on Prompts"
                value={formatValue(totals?.promptViews)}
                trend={{
                  value: totals ? `${formatValue(totals.promptViews)} total` : '—',
                  isUp: true,
                }}
                icon={<MdVisibility size={20} />}
                color="teal"
              />
            </Link>
            <Link href="/dashboard/analytics" className="block">
              <StatCard
                title="Views on Blogs"
                value={formatValue(totals?.postViews)}
                trend={{
                  value: totals ? `${formatValue(totals.postViews)} total` : '—',
                  isUp: true,
                }}
                icon={<MdMenuBook size={20} />}
                color="amber"
              />
            </Link>
          </div>
        </>
      ) : null}

      {canViewActivity ? (
        <div className="rounded-[28px] border border-[#eef2f6] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[1.05rem] font-medium text-[#0f1116]">Recent Activity</h2>
              <p className="text-[0.82rem] text-gray-400 mt-0.5">
                Latest events across your content
              </p>
            </div>
            <Link
              href="/dashboard/activity"
              className="flex items-center gap-1 text-[0.82rem] text-[#1e4fd2] hover:underline"
            >
              View all
              <MdArrowForward size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              <p className="text-[0.85rem] text-gray-400">Loading recent activity…</p>
            ) : recentActivity.length > 0 ? (
              recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-gray-50 -mx-2.5"
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.color}`}
                  >
                    {item.icon}
                  </span>
                  <div className="flex flex-1 items-center justify-between gap-4 mt-1">
                    <p className="text-[0.85rem] text-[#0f1116]">{item.message}</p>
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 text-[0.78rem] text-gray-400 lg:w-[70px] text-right">
                        {item.time}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[0.85rem] text-gray-400">No recent activity yet.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
