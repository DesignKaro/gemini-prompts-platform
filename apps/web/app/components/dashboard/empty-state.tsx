'use client';

import React from 'react';
import { MdInbox } from 'react-icons/md';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e1e5ee] bg-white px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-400">
        {icon || <MdInbox size={32} />}
      </div>
      <h3 className="text-[1.1rem] font-medium text-[#0f1116]">{title}</h3>
      <p className="mt-2 max-w-[320px] text-[0.85rem] text-gray-500">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
