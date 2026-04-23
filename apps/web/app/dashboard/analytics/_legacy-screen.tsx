'use client';

import React, { useState, useEffect, useMemo, useId } from 'react';
import Link from 'next/link';
import {
  MdAttachMoney,
  MdVisibility,
  MdGroup,
  MdTrendingUp,
  MdArrowDropDown,
} from 'react-icons/md';
import { StatCard } from '../../components/dashboard/stat-card';
import { useAdminApi } from '../../components/dashboard/use-admin-api';
import { ActionError } from '../../components/dashboard/action-error';

const DATE_RANGES = ['7 days', '30 days', '90 days'] as const;
type DateRange = (typeof DATE_RANGES)[number];

type AnalyticsOverview = {
  rangeDays: number;
  totals: {
    prompts: number;
    posts: number;
    users: number;
    comments: number;
    categories: number;
    tags: number;
    views: number;
    promptViews: number;
    postViews: number;
    revenue: number;
    newUsers: number;
  };
  engagement: {
    views: number;
    likes: number;
    saves: number;
    shares: number;
  };
  series: {
    labels: string[];
    views: number[];
  };
  topPrompts: Array<{ id: string; title: string; viewCount: number }>;
  topPosts: Array<{ id: string; title: string; viewCount: number }>;
};

function SparklineChart({ data, labels }: { data: number[]; labels?: string[] }) {
  const gradientId = useId();
  const safeData = data.length > 1 ? data : [data[0] ?? 0, data[0] ?? 0];
  const safeLabels =
    labels && labels.length > 1 ? labels : [labels?.[0] ?? 'Start', labels?.[0] ?? 'Now'];
  const width = 600;
  const height = 200;
  const padTop = 18;
  const padRight = 16;
  const padBottom = 22;
  const padLeft = 50;
  const min = Math.min(...safeData);
  const max = Math.max(...safeData);
  const range = max - min || 1;

  const formatValue = (value: number) => value.toLocaleString();

  const ticks =
    max === min
      ? [{ value: max, y: padTop + (height - padTop - padBottom) / 2 }]
      : [
          { value: max, y: padTop },
          { value: Math.round(min + range / 2), y: height / 2 },
          { value: min, y: height - padBottom },
        ];

  const points = safeData.map((value, index) => {
    const x = padLeft + (index / (safeData.length - 1)) * (width - padLeft - padRight);
    const y = padTop + (1 - (value - min) / range) * (height - padTop - padBottom);

    return {
      x,
      y,
      value,
      label: safeLabels[index] ?? `Point ${index + 1}`,
    };
  });

  const pathD = `M ${points.map((point) => `${point.x},${point.y}`).join(' L ')}`;
  const fillD = `${pathD} L ${width - padRight},${height - padBottom} L ${padLeft},${height - padBottom} Z`;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activePoint = activeIndex === null ? null : (points[activeIndex] ?? null);

  return (
    <div className="relative h-full w-full">
      {activePoint && (
        <div
          className="pointer-events-none absolute z-10"
          style={{
            left: `${(activePoint.x / width) * 100}%`,
            top: `${(activePoint.y / height) * 100}%`,
            transform: 'translate(-50%, calc(-100% - 12px))',
          }}
        >
          <div className="flex flex-col items-center gap-1.5">
            <div className="min-w-[170px] whitespace-nowrap rounded-full bg-[#0f1116] px-5 py-1.5 text-center text-[0.74rem] font-semibold tracking-[0.01em] text-white">
              {activePoint.label}
            </div>
            <div className="min-w-[170px] whitespace-nowrap rounded-[12px] border border-[#e6ebf2] bg-white px-5 py-1.5 text-center text-[0.74rem] font-medium text-[#0f1116]">
              Views: {formatValue(activePoint.value)}
            </div>
          </div>
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        preserveAspectRatio="none"
        onMouseLeave={() => setActiveIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d5ea52" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#d5ea52" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => (
          <g key={`${tick.value}-${tick.y}`}>
            <line
              x1={padLeft}
              x2={width - padRight}
              y1={tick.y}
              y2={tick.y}
              stroke="#edf1f6"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
            <text x={6} y={tick.y + 4} fill="#98a1b2" fontSize="11" fontWeight="500">
              {formatValue(tick.value)}
            </text>
          </g>
        ))}

        <path d={fillD} fill={`url(#${gradientId})`} />
        <path
          d={pathD}
          fill="none"
          stroke="#d5ea52"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {activePoint && (
          <>
            <line
              x1={activePoint.x}
              x2={activePoint.x}
              y1={padTop}
              y2={height - padBottom}
              stroke="#d5ea52"
              strokeOpacity="0.22"
              strokeWidth="1.5"
              strokeDasharray="4 5"
            />
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="5.5"
              fill="#d5ea52"
              stroke="#ffffff"
              strokeWidth="2.5"
            />
          </>
        )}

        {points.map((point, index) => (
          <circle
            key={`${point.label}-${index}`}
            cx={point.x}
            cy={point.y}
            r="14"
            fill="transparent"
            className="cursor-pointer"
            onMouseEnter={() => setActiveIndex(index)}
            onFocus={() => setActiveIndex(index)}
            onBlur={() => setActiveIndex(null)}
          />
        ))}
      </svg>
    </div>
  );
}

export default function AnalyticsPage() {
  const { request, status: authStatus } = useAdminApi();
  const [dateRange, setDateRange] = useState<DateRange>('30 days');
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const rangeDays = useMemo(() => {
    if (dateRange === '7 days') return 7;
    if (dateRange === '90 days') return 90;
    return 30;
  }, [dateRange]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    let isActive = true;
    setIsLoading(true);
    setLoadError(null);

    request<AnalyticsOverview>(`/api/admin/analytics?range=${rangeDays}`, {
      actionName: 'dashboard.analytics.read',
    })
      .then((payload) => {
        if (!isActive) return;
        setOverview(payload);
      })
      .catch((err: Error) => {
        if (!isActive) return;
        setLoadError(err.message || 'Unable to load analytics.');
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [authStatus, rangeDays, request]);

  const trafficSources = useMemo(() => {
    const engagement = overview?.engagement;
    if (!engagement) return [];
    const total = engagement.views + engagement.likes + engagement.saves + engagement.shares;
    const toPercent = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0);
    return [
      { label: 'Views', value: toPercent(engagement.views), color: 'bg-[#d5ea52]' },
      { label: 'Likes', value: toPercent(engagement.likes), color: 'bg-blue-500' },
      { label: 'Saves', value: toPercent(engagement.saves), color: 'bg-purple-500' },
      { label: 'Shares', value: toPercent(engagement.shares), color: 'bg-orange-500' },
    ];
  }, [overview?.engagement]);

  const chartSeries = overview?.series?.views?.length ? overview.series.views : [0];
  const totals = overview?.totals;

  const handleExport = () => {
    const csv = [
      'Prompt,Views',
      ...(overview?.topPrompts ?? []).map((p) => `"${p.title}",${p.viewCount}`),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${dateRange.replace(' ', '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportDone(true);
    setTimeout(() => setExportDone(false), 2500);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.8rem] font-medium tracking-tight text-[#0f1116] sm:text-[2rem]">
            Analytics
          </h1>
          <p className="text-[0.95rem] text-gray-500">
            Understand how your prompts and posts perform over time.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0f1116] px-4 py-2 text-[0.85rem] font-medium text-white shadow-sm hover:opacity-90 transition-opacity"
        >
          {exportDone ? 'Downloaded!' : 'Export report'}
        </button>
      </div>

      {loadError && <ActionError error={loadError} />}

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Revenue"
          value={`$${(totals?.revenue ?? 0).toLocaleString()}`}
          trend={{ value: `${rangeDays}d`, isUp: true }}
          icon={<MdAttachMoney size={24} />}
          color="blue"
        />
        <StatCard
          title="Prompt views"
          value={(totals?.promptViews ?? 0).toLocaleString()}
          trend={{ value: `${rangeDays}d`, isUp: true }}
          icon={<MdVisibility size={24} />}
          color="lime"
        />
        <StatCard
          title="New customers"
          value={(totals?.newUsers ?? 0).toLocaleString()}
          trend={{ value: `${rangeDays}d`, isUp: true }}
          icon={<MdGroup size={24} />}
          color="purple"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Performance chart */}
        <section className="rounded-[30px] border border-[#eef2f6] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[1.1rem] font-medium text-[#0f1116]">Performance overview</h2>
              <p className="text-[0.8rem] text-gray-400 mt-1">
                Revenue and views over the selected period.
              </p>
            </div>

            {/* Date range picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDateOpen((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full border border-[#e1e5ee] bg-[#f9fafb] px-3 py-1.5 text-[0.78rem] text-[#4b5563] hover:bg-gray-100 transition-colors"
              >
                <MdTrendingUp size={14} />
                {dateRange}
                <MdArrowDropDown size={16} />
              </button>
              {isDateOpen && (
                <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-36 rounded-[12px] border border-[#e2e6ee] bg-white p-1.5 shadow-xl">
                  {DATE_RANGES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setDateRange(r);
                        setIsDateOpen(false);
                      }}
                      className={`flex w-full items-center rounded-[8px] px-3 py-2 text-[0.82rem] transition-colors ${
                        dateRange === r
                          ? 'bg-[#0f1116] text-white'
                          : 'text-[#0f1116] hover:bg-gray-50'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 h-[220px] rounded-2xl">
            <SparklineChart data={chartSeries} labels={overview?.series?.labels} />
          </div>

          {/* X axis labels */}
          <div className="mt-2 flex justify-between text-[0.72rem] text-gray-400 px-1">
            <span>Start</span>
            <span>Mid</span>
            <span>Now</span>
          </div>
        </section>

        {/* Traffic sources */}
        <section className="rounded-[30px] border border-[#eef2f6] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-[1.1rem] font-medium text-[#0f1116]">Traffic sources</h2>
          <p className="text-[0.8rem] text-gray-400 mt-1">
            Where visitors are discovering your content.
          </p>
          <div className="mt-6 flex flex-col gap-5">
            {trafficSources.length > 0 ? (
              trafficSources.map((source) => (
                <div key={source.label} className="space-y-2">
                  <div className="flex items-center justify-between text-[0.85rem]">
                    <span className="font-medium text-gray-600">{source.label}</span>
                    <span className="font-medium text-[#0f1116]">{source.value}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${source.color}`}
                      style={{ width: `${source.value}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[0.85rem] text-gray-400">
                {isLoading ? 'Loading engagement…' : 'No engagement data yet.'}
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Top performing prompts */}
      <section className="rounded-[30px] border border-[#eef2f6] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-[1.1rem] font-medium text-[#0f1116]">Top performing prompts</h2>
            <p className="text-[0.8rem] text-gray-400 mt-1">
              Ranked by views over the last {dateRange}.
            </p>
          </div>
          <Link
            href="/dashboard/analytics/prompts"
            className="inline-flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] text-[#0f1116] transition-colors hover:bg-gray-50"
          >
            View all
          </Link>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="text-[0.78rem] font-medium uppercase tracking-wide text-gray-400 border-b border-gray-50">
                <th className="pb-3">Prompt</th>
                <th className="pb-3">Views</th>
                <th className="pb-3 text-right">Share of Views</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(overview?.topPrompts ?? []).length > 0 ? (
                (overview?.topPrompts ?? []).map((prompt) => {
                  const totalViews = totals?.promptViews ?? 0;
                  const share =
                    totalViews > 0 ? Math.round((prompt.viewCount / totalViews) * 100) : 0;
                  return (
                    <tr key={prompt.id} className="group hover:bg-gray-50 transition-colors">
                      <td className="py-4 text-[0.92rem] font-medium text-[#0f1116]">
                        {prompt.title}
                      </td>
                      <td className="py-4 text-[0.85rem] text-gray-600">
                        {prompt.viewCount.toLocaleString()}
                      </td>
                      <td className="py-4 text-right text-[0.85rem] text-gray-600">{share}%</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-[0.85rem] text-gray-400">
                    {isLoading ? 'Loading top prompts…' : 'No prompt data available yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
