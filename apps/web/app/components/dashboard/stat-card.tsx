'use client';

import React from 'react';
import { MdTrendingUp, MdTrendingDown } from 'react-icons/md';

interface StatCardProps {
  title: string;
  value: string;
  trend: {
    value: string;
    isUp: boolean;
  };
  icon: React.ReactNode;
  color: 'blue' | 'lime' | 'purple' | 'orange' | 'teal' | 'amber';
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-600',
  lime: 'bg-[#d5ea52]/10 text-[#a3b330]',
  purple: 'bg-purple-50 text-purple-600',
  orange: 'bg-orange-50 text-orange-600',
  teal: 'bg-teal-50 text-teal-600',
  amber: 'bg-amber-50 text-amber-600',
};

const iconBgMap = {
  blue: 'bg-blue-100/50',
  lime: 'bg-[#d5ea52]/20',
  purple: 'bg-purple-100/50',
  orange: 'bg-orange-100/50',
  teal: 'bg-teal-100/50',
  amber: 'bg-amber-100/50',
};

const strokeColorMap = {
  blue: 'text-blue-500',
  lime: 'text-[#a3b330]',
  purple: 'text-purple-500',
  orange: 'text-orange-500',
  teal: 'text-teal-500',
  amber: 'text-amber-500',
};

export function StatCard({ title, value, trend, icon, color }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[#eef2f6] bg-white p-4 shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_8px_16px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBgMap[color]} ${colorMap[color]}`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-medium ${trend.isUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {trend.isUp ? <MdTrendingUp size={12} /> : <MdTrendingDown size={12} />}
          {trend.value}
        </div>
      </div>
      <div className="mt-4 flex flex-row items-end justify-between gap-4">
        <div>
          <p className="text-[0.8rem] text-gray-500 font-medium">{title}</p>
          <h3 className="mt-0.5 text-[1.45rem] font-medium text-[#0f1116] tracking-tight leading-none">{value}</h3>
          <span className="text-[0.65rem] text-gray-400 mt-1 block">vs last month</span>
        </div>
        <div className={`h-11 w-24 ${trend.isUp ? strokeColorMap[color] : 'text-red-500'}`}>
          <svg width="100%" height="100%" viewBox="0 0 100 30" preserveAspectRatio="none" className="overflow-visible stroke-current drop-shadow-sm">
            <defs>
              <linearGradient id={`grad-${title.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            {trend.isUp ? (
              <>
                <path d="M0,25 C20,20 30,10 50,15 C70,20 80,5 100,5" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M0,25 C20,20 30,10 50,15 C70,20 80,5 100,5 L100,30 L0,30 Z" fill={`url(#grad-${title.replace(/\s+/g, '-')})`} stroke="none" />
              </>
            ) : (
              <>
                <path d="M0,5 C20,10 30,20 50,15 C70,10 80,25 100,25" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M0,5 C20,10 30,20 50,15 C70,10 80,25 100,25 L100,30 L0,30 Z" fill={`url(#grad-${title.replace(/\s+/g, '-')})`} stroke="none" />
              </>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
