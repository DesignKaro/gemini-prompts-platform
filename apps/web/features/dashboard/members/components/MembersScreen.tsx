'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { MdRefresh } from 'react-icons/md';
import { ActionError } from '@/app/components/dashboard/action-error';
import { useAdminApi } from '@/app/components/dashboard/use-admin-api';
import { getInitial, normalizeAvatarUrl } from '@/lib/utils/avatar';
import { isProtectedSuperadminEmail } from '@/lib/utils/permissions';

type MembershipStatus = 'FREE' | 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'PAST_DUE';
type MembershipPlan = 'FREE' | 'PREMIUM';
type UserRole = 'SUPERADMIN' | 'ADMIN' | 'EDITOR' | 'MODERATOR' | 'USER';

type MembersUser = {
  id: string;
  name: string | null;
  email: string;
  handle: string | null;
  avatarUrl: string | null;
  role: UserRole;
  plan: MembershipPlan;
  createdAt: string;
  membership: {
    status: MembershipStatus;
    active: boolean;
    provider: string | null;
    startAt: string | null;
    endAt: string | null;
    canceledAt: string | null;
  };
};

type MembersResponse = {
  items: MembersUser[];
  total: number;
};

const MEMBERS_PAGE_SIZE = 200;

const PLAN_BADGES: Record<MembershipPlan, string> = {
  FREE: 'bg-[#f3f4f6] text-[#4b5563]',
  PREMIUM: 'bg-[#d5ea52] text-[#101625]',
};

const MEMBERSHIP_STATUS_BADGES: Record<MembershipStatus, string> = {
  FREE: 'bg-[#f5f7fa] text-[#475063] border-[#e1e6ee]',
  ACTIVE: 'bg-[#e9f7ed] text-[#20633a] border-[#cde9d7]',
  CANCELED: 'bg-[#f4f5f7] text-[#4c5564] border-[#dde2e8]',
  EXPIRED: 'bg-[#fff1f1] text-[#9b2c2c] border-[#f3d2d2]',
  PAST_DUE: 'bg-[#fff7e8] text-[#8b5a16] border-[#f4dfbf]',
};

function formatDate(value: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function toDateInputValue(value: string | null) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateInputToEndOfDayIso(value: string) {
  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) {
    return null;
  }
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999)).toISOString();
}

function mapNextDateDrafts(items: MembersUser[], current: Record<string, string>) {
  const next = { ...current };
  for (const item of items) {
    next[item.id] = toDateInputValue(item.membership.endAt);
  }
  return next;
}

export function MembersScreen() {
  const { request: adminRequest } = useAdminApi();
  const { data: session } = useSession();
  const [members, setMembers] = useState<MembersUser[]>([]);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateDrafts, setDateDrafts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const canManageMembership = isProtectedSuperadminEmail(session?.user?.email);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const fetchMembers = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);

      const query = new URLSearchParams();
      query.set('take', String(MEMBERS_PAGE_SIZE));
      if (debouncedSearch) {
        query.set('search', debouncedSearch);
      }

      try {
        const payload = await adminRequest<MembersResponse>(
          `/api/admin/users/memberships?${query.toString()}`,
          {
            actionName: 'admin.members.list',
            signal,
          },
        );
        setMembers(payload.items ?? []);
        setTotal(payload.total ?? payload.items.length ?? 0);
        setDateDrafts((current) => mapNextDateDrafts(payload.items ?? [], current));
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name === 'AbortError') {
          return;
        }
        setError(requestError instanceof Error ? requestError.message : 'Unable to load members.');
      } finally {
        setIsLoading(false);
      }
    },
    [adminRequest, debouncedSearch],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchMembers(controller.signal);
    return () => controller.abort();
  }, [fetchMembers, refreshNonce]);

  const activeMembers = useMemo(
    () => members.filter((member) => member.membership.active).length,
    [members],
  );

  const updateMembership = async (member: MembersUser, endAt: string | null) => {
    setSavingUserId(member.id);
    setError(null);
    try {
      const payload = await adminRequest<MembersUser>(`/api/admin/users/${member.id}/membership`, {
        method: 'PATCH',
        actionName: endAt ? 'admin.members.set-until' : 'admin.members.remove',
        body: JSON.stringify({ endAt }),
      });
      setMembers((current) => current.map((item) => (item.id === member.id ? payload : item)));
      setDateDrafts((current) => ({
        ...current,
        [member.id]: toDateInputValue(payload.membership.endAt),
      }));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to update membership access.',
      );
    } finally {
      setSavingUserId(null);
    }
  };

  const assignMembershipUntilDate = async (member: MembersUser) => {
    const dateInput = dateDrafts[member.id];
    const endAt = dateInput ? dateInputToEndOfDayIso(dateInput) : null;
    if (!endAt) {
      setError('Select a valid membership end date before saving.');
      return;
    }
    await updateMembership(member, endAt);
  };

  const removeMembership = async (member: MembersUser) => {
    await updateMembership(member, null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.85rem] font-semibold leading-tight text-[#0f1116]">Members</h1>
          <p className="mt-1 text-[0.95rem] text-gray-500">
            Manage member access windows, plans, and subscription timeline data.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshNonce((value) => value + 1)}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-[#d9dfeb] bg-white px-4 text-[0.82rem] font-medium text-[#0f1116] transition-colors hover:bg-[#f5f7fb]"
        >
          <MdRefresh size={16} />
          Refresh
        </button>
      </div>

      {!canManageMembership ? (
        <div className="rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-[0.85rem] text-amber-900">
          Membership assignment is restricted to superadmin.
        </div>
      ) : null}

      <ActionError error={error} />

      <div className="rounded-[20px] border border-[#e8ecf4] bg-white p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-[0.74rem] font-semibold uppercase tracking-wide text-gray-500 md:col-span-2">
            Search
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by user name, email, or handle..."
              className="h-10 rounded-xl border border-[#e3e8f3] bg-white px-3 text-[0.86rem] font-medium text-[#0f1116] outline-none transition-colors placeholder:text-gray-400 focus:border-[#c9d5f0]"
            />
          </label>

          <div className="flex items-end gap-2 md:justify-end">
            <div className="rounded-xl border border-[#e5e9f1] bg-[#f8fafd] px-3 py-2 text-right">
              <p className="text-[0.72rem] uppercase tracking-[0.08em] text-[#8a93a3]">
                Active members
              </p>
              <p className="text-[1.15rem] font-semibold text-[#101625]">{activeMembers}</p>
            </div>
            <div className="rounded-xl border border-[#e5e9f1] bg-[#f8fafd] px-3 py-2 text-right">
              <p className="text-[0.72rem] uppercase tracking-[0.08em] text-[#8a93a3]">Total users</p>
              <p className="text-[1.15rem] font-semibold text-[#101625]">{total}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[20px] border border-[#e8ecf4] bg-white">
        <table className="w-full min-w-[1120px] text-left text-[0.85rem]">
          <thead className="bg-[#f8fafd] text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-gray-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Membership</th>
              <th className="px-4 py-3">Access Window</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf0f5]">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#6a7282]">
                  Loading members...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#6a7282]">
                  No users found for the current filter.
                </td>
              </tr>
            ) : (
              members.map((member) => {
                const avatarSrc = normalizeAvatarUrl(member.avatarUrl);
                const dateValue = dateDrafts[member.id] ?? '';
                const isSaving = savingUserId === member.id;
                const canManageRow = canManageMembership;

                return (
                  <tr key={member.id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#eef2f7]">
                          {avatarSrc ? (
                            <img
                              src={avatarSrc}
                              alt={member.name ?? member.email}
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <span className="text-[0.82rem] font-medium text-[#1b2028]">
                              {getInitial(member.name ?? member.email)}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-[0.92rem] font-medium text-[#0f1116]">
                            {member.name ?? 'Unnamed user'}
                          </p>
                          <p className="text-[0.8rem] text-gray-500">{member.email}</p>
                          {member.handle ? (
                            <p className="text-[0.75rem] text-gray-400">@{member.handle}</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-[0.8rem] text-[#3f4757]">{member.role}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[0.74rem] font-medium ${PLAN_BADGES[member.plan]}`}
                      >
                        {member.plan}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-[0.74rem] font-medium ${MEMBERSHIP_STATUS_BADGES[member.membership.status]}`}
                      >
                        {member.membership.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[0.8rem] text-[#4b5563]">
                      <p>From: {formatDate(member.membership.startAt)}</p>
                      <p className="mt-1">Until: {formatDate(member.membership.endAt)}</p>
                    </td>
                    <td className="px-4 py-4 text-[0.8rem] text-[#4b5563]">
                      {member.membership.provider ?? '—'}
                    </td>
                    <td className="px-4 py-4">
                      {canManageRow ? (
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <input
                            type="date"
                            value={dateValue}
                            onChange={(event) =>
                              setDateDrafts((current) => ({
                                ...current,
                                [member.id]: event.target.value,
                              }))
                            }
                            className="h-9 rounded-lg border border-[#dbe2ef] bg-white px-2 text-[0.78rem] text-[#0f1116] outline-none focus:border-[#c9d5f0]"
                          />
                          <button
                            type="button"
                            onClick={() => assignMembershipUntilDate(member)}
                            disabled={isSaving}
                            className="h-9 rounded-full bg-[#d5ea52] px-3 text-[0.75rem] font-medium text-[#101625] transition hover:bg-[#c5db42] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSaving ? 'Saving...' : 'Set until'}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeMembership(member)}
                            disabled={isSaving}
                            className="h-9 rounded-full border border-[#dbe2ef] bg-white px-3 text-[0.75rem] font-medium text-[#101625] transition hover:bg-[#f8fafd] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <p className="text-right text-[0.75rem] text-[#8a93a3]">
                          Superadmin access required
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
