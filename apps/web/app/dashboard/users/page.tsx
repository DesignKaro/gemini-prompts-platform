'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import {
  MdSearch,
  MdRefresh,
  MdShield,
  MdClose,
  MdAdd,
  MdDeleteOutline,
  MdPauseCircleOutline,
  MdPlayCircleOutline,
} from 'react-icons/md';
import { useAdminApi } from '../../components/dashboard/use-admin-api';
import { getInitial, normalizeAvatarUrl } from '../../../lib/utils/avatar';
import {
  PROTECTED_SUPERADMIN_EMAIL,
  hasPermission,
  isProtectedSuperadminEmail,
} from '../../../lib/utils/permissions';
import { Skeleton } from '../../components/ui/skeleton';
import { useConfirmDialog } from '../../components/ui/confirm-dialog';

const SYSTEM_ROLE_OPTIONS = ['SUPERADMIN', 'ADMIN', 'EDITOR', 'MODERATOR', 'USER'] as const;

type UserRole = (typeof SYSTEM_ROLE_OPTIONS)[number];
type MembershipPlan = 'PREMIUM' | 'FREE';

type RoleSummary = {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
};

type ApiRoleAssignment = {
  roleId: string;
  role?: RoleSummary;
};

type ApiUser = {
  id: string;
  name: string | null;
  email: string;
  handle: string | null;
  role: UserRole;
  plan: MembershipPlan;
  avatarUrl: string | null;
  suspendedAt?: string | null;
  createdAt: string;
  roles?: ApiRoleAssignment[];
};

type UserItem = Omit<ApiUser, 'roles'> & { roles: RoleSummary[] };

type RolesPayload = RoleSummary[];

const PLAN_STYLES: Record<MembershipPlan, { bg: string; text: string }> = {
  PREMIUM: { bg: 'bg-[#0f1116]', text: 'text-white' },
  FREE: { bg: 'bg-[#f3f4f6]', text: 'text-[#4b5563]' },
};

function mapUser(user: ApiUser): UserItem {
  const roles = (user.roles ?? [])
    .map((assignment) => {
      const role = assignment.role;
      if (role) {
        return {
          id: role.id,
          name: role.name,
          description: role.description ?? null,
          isSystem: Boolean(role.isSystem),
        };
      }
      return {
        id: assignment.roleId,
        name: 'Custom role',
        description: null,
        isSystem: false,
      };
    })
    .filter(Boolean);

  return {
    ...user,
    roles,
  };
}

export default function UsersPage() {
  const { request, status } = useAdminApi();
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    roleSelection: 'system:USER',
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  const isSuperadmin = isProtectedSuperadminEmail(session?.user?.email);
  const currentUserId = session?.user?.id;
  const canReadRoles = hasPermission(session, 'roles:read');
  const canManageUsers = hasPermission(session, 'users:manage');

  const loadUsers = async () => {
    if (status !== 'authenticated') return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const payload = await request<{ items: ApiUser[]; total: number }>(
        '/api/admin/users?take=200',
      );
      setUsers((payload.items ?? []).map(mapUser));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { message?: string }).message;
      setLoadError(message || 'Unable to load users.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRoles = async () => {
    if (status !== 'authenticated' || !canReadRoles) return;
    try {
      const payload = await request<RolesPayload>('/api/admin/roles');
      setRoles(payload ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { message?: string }).message;
      setLoadError(message || 'Unable to load roles.');
    }
  };

  useEffect(() => {
    loadUsers();
  }, [status]);

  useEffect(() => {
    loadRoles();
  }, [status, canReadRoles]);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter((user) =>
      [user.name, user.email, user.handle, user.role, ...user.roles.map((role) => role.name)].some(
        (value) => (value ?? '').toLowerCase().includes(q),
      ),
    );
  }, [search, users]);

  const customRoles = useMemo(() => roles.filter((role) => !role.isSystem), [roles]);
  const combinedRoleOptions = useMemo(() => {
    const system = SYSTEM_ROLE_OPTIONS.map((role) => ({
      value: `system:${role}`,
      label: role,
      kind: 'system' as const,
    }));
    const custom = customRoles.map((role) => ({
      value: `custom:${role.id}`,
      label: role.name,
      kind: 'custom' as const,
    }));
    return [...system, ...custom];
  }, [customRoles]);

  const updateSystemRole = async (id: string, role: UserRole) => {
    const updated = await request<ApiUser>(`/api/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    return mapUser(updated);
  };

  const updateCustomRoles = async (id: string, roleIds: string[]) => {
    const updated = await request<ApiUser>(`/api/admin/users/${id}/roles`, {
      method: 'PATCH',
      body: JSON.stringify({ roleIds }),
    });
    return mapUser(updated);
  };

  const applyRoleSelection = async (user: UserItem, selection: string) => {
    if (!canManageUsers) return;
    if (selection === 'system:SUPERADMIN' && !isProtectedSuperadminEmail(user.email)) {
      setLoadError(`Only ${PROTECTED_SUPERADMIN_EMAIL} can be assigned SUPERADMIN.`);
      return;
    }
    setSavingId(user.id);
    setLoadError(null);
    try {
      let updatedUser = user;
      if (selection.startsWith('system:')) {
        const nextRole = selection.replace('system:', '') as UserRole;
        if (user.role !== nextRole) {
          updatedUser = await updateSystemRole(user.id, nextRole);
        }
        if (user.roles.some((role) => !role.isSystem)) {
          updatedUser = await updateCustomRoles(user.id, []);
        }
      } else if (selection.startsWith('custom:')) {
        const roleId = selection.replace('custom:', '');
        if (user.role !== 'USER') {
          updatedUser = await updateSystemRole(user.id, 'USER');
        }
        updatedUser = await updateCustomRoles(user.id, [roleId]);
      }
      setUsers((prev) => prev.map((item) => (item.id === user.id ? updatedUser : item)));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { message?: string }).message;
      setLoadError(message || 'Unable to update role.');
    } finally {
      setSavingId(null);
    }
  };

  const toggleSuspend = async (user: UserItem) => {
    if (!canManageUsers) return;
    if (user.id === currentUserId) {
      setLoadError('You cannot suspend your own account.');
      return;
    }
    const nextAction = user.suspendedAt ? 'activate' : 'suspend';
    const confirmLabel = user.suspendedAt
      ? `Activate ${user.email}?`
      : `Suspend ${user.email}? They will be unable to sign in.`;
    const ok = await confirm({
      title: user.suspendedAt ? 'Activate user' : 'Suspend user',
      description: confirmLabel,
      confirmLabel: user.suspendedAt ? 'Activate' : 'Suspend',
      tone: 'default',
    });
    if (!ok) return;
    setActionId(user.id);
    setLoadError(null);
    try {
      const updated = await request<ApiUser>(`/api/admin/users/${user.id}/${nextAction}`, {
        method: 'PATCH',
      });
      setUsers((prev) => prev.map((item) => (item.id === user.id ? mapUser(updated) : item)));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { message?: string }).message;
      setLoadError(message || 'Unable to update user status.');
    } finally {
      setActionId(null);
    }
  };

  const deleteUser = async (user: UserItem) => {
    if (!canManageUsers) return;
    if (user.id === currentUserId) {
      setLoadError('You cannot delete your own account.');
      return;
    }
    const confirmed = await confirm({
      title: 'Delete user',
      description: `Delete ${user.email}? This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) return;
    setActionId(user.id);
    setLoadError(null);
    try {
      await request(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      setUsers((prev) => prev.filter((item) => item.id !== user.id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { message?: string }).message;
      setLoadError(message || 'Unable to delete user.');
    } finally {
      setActionId(null);
    }
  };

  const openCreateModal = () => {
    setCreateForm({
      name: '',
      email: '',
      password: '',
      roleSelection: 'system:USER',
    });
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setCreateError(null);
    setIsCreating(false);
  };

  const createUser = async () => {
    const email = createForm.email.trim();
    if (!email) {
      setCreateError('Email is required.');
      return;
    }
    if (createForm.roleSelection === 'system:SUPERADMIN' && !isProtectedSuperadminEmail(email)) {
      setCreateError(`Only ${PROTECTED_SUPERADMIN_EMAIL} can be assigned SUPERADMIN.`);
      return;
    }
    const selected = createForm.roleSelection;
    const isCustom = selected.startsWith('custom:');
    const roleIds = isCustom ? [selected.replace('custom:', '')] : [];
    const role = isCustom ? 'USER' : (selected.replace('system:', '') as UserRole);
    setIsCreating(true);
    setCreateError(null);
    try {
      const payload = await request<ApiUser>('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name: createForm.name.trim() || null,
          email,
          password: createForm.password.trim() || null,
          role,
          roleIds,
        }),
      });
      const mapped = mapUser(payload);
      setUsers((prev) => [mapped, ...prev]);
      closeCreateModal();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { message?: string }).message;
      setCreateError(message || 'Unable to create user.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.8rem] font-medium tracking-tight text-[#0f1116]">Users</h1>
          <p className="text-[0.95rem] text-gray-500">
            Manage roles, access levels, and memberships.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-[#e2e6ee] bg-white px-3 py-2 text-[0.85rem] text-gray-600">
            <MdShield size={16} className="text-[#5b33b8]" />
            Superadmin is reserved for {PROTECTED_SUPERADMIN_EMAIL}
          </div>
          {isSuperadmin && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0f1116] px-4 py-2 text-[0.85rem] font-medium text-white transition hover:bg-black"
            >
              <MdAdd size={16} />
              Add User
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              loadUsers();
              loadRoles();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] text-[#0f1116] transition-colors hover:bg-gray-50"
          >
            <MdRefresh size={16} />
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-[20px] border border-[#e2e6ee] bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full items-center gap-2 rounded-full border border-[#e1e5ee] bg-[#f7f9fc] px-3 py-2 text-[0.9rem] text-[#1b2028] sm:max-w-[320px]">
            <MdSearch className="text-[#5f6773]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users"
              className="w-full bg-transparent outline-none"
            />
          </div>
          <p className="text-[0.85rem] text-gray-500">{filtered.length} users</p>
        </div>

        {loadError && (
          <div className="mt-4 rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-[0.85rem] text-red-700">
            {loadError}
          </div>
        )}

        {isLoading ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-[0.85rem]">
              <thead className="text-[0.72rem] font-medium uppercase tracking-[0.16em] text-gray-400">
                <tr>
                  <th className="px-3 pb-3">User</th>
                  <th className="px-3 pb-3">Role</th>
                  <th className="px-3 pb-3">Plan</th>
                  <th className="px-3 pb-3">Status</th>
                  <th className="px-3 pb-3">Joined</th>
                  <th className="px-3 pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1f6]">
                {Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`user-skeleton-${index}`} className="align-top">
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-11 w-11 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-44" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <Skeleton className="h-9 w-full rounded-xl" />
                    </td>
                    <td className="px-3 py-4">
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </td>
                    <td className="px-3 py-4">
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </td>
                    <td className="px-3 py-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <Skeleton className="h-9 w-9 rounded-full" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-[0.85rem]">
              <thead className="text-[0.72rem] font-medium uppercase tracking-[0.16em] text-gray-400">
                <tr>
                  <th className="px-3 pb-3">User</th>
                  <th className="px-3 pb-3">Role</th>
                  <th className="px-3 pb-3">Plan</th>
                  <th className="px-3 pb-3">Status</th>
                  <th className="px-3 pb-3">Joined</th>
                  <th className="px-3 pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1f6]">
                {filtered.map((user) => {
                  const customRole = user.roles.find((role) => !role.isSystem);
                  const planStyle = PLAN_STYLES[user.plan] ?? PLAN_STYLES.FREE;
                  const avatarSrc = normalizeAvatarUrl(user.avatarUrl);
                  const isProtectedUser = isProtectedSuperadminEmail(user.email);
                  const isLocked = isProtectedUser || (!isSuperadmin && user.role === 'SUPERADMIN');
                  const canEditSystemRole = canManageUsers && !isLocked;
                  const currentSelection = (() => {
                    if (customRole) {
                      const customValue = `custom:${customRole.id}`;
                      return combinedRoleOptions.some((option) => option.value === customValue)
                        ? customValue
                        : `system:${user.role}`;
                    }
                    return `system:${user.role}`;
                  })();
                  const isSuspended = Boolean(user.suspendedAt);

                  return (
                    <tr key={user.id} className="align-top">
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#eef2f7]">
                            {avatarSrc ? (
                              <img
                                src={avatarSrc}
                                alt={user.name ?? user.email}
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                                crossOrigin="anonymous"
                              />
                            ) : (
                              <span className="text-[0.85rem] font-medium text-[#1b2028]">
                                {getInitial(user.name ?? user.email)}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-[0.95rem] font-medium text-[#0f1116]">
                              {user.name ?? 'Unnamed user'}
                            </p>
                            <p className="text-[0.82rem] text-gray-500">{user.email}</p>
                            {user.handle && (
                              <p className="text-[0.78rem] text-gray-400">@{user.handle}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        {canEditSystemRole ? (
                          <select
                            className="w-full rounded-xl border border-[#e1e5ee] bg-white px-3 py-2 text-[0.85rem] text-[#0f1116]"
                            value={currentSelection}
                            disabled={savingId === user.id}
                            onChange={(e) => applyRoleSelection(user, e.target.value)}
                          >
                            {combinedRoleOptions.map((option) => {
                              const isSuperadminOption =
                                option.kind === 'system' &&
                                option.label === 'SUPERADMIN' &&
                                !isProtectedUser;
                              return (
                                <option
                                  key={option.value}
                                  value={option.value}
                                  disabled={isSuperadminOption}
                                >
                                  {option.kind === 'custom'
                                    ? `Custom · ${option.label}`
                                    : option.label}
                                </option>
                              );
                            })}
                          </select>
                        ) : (
                          <div className="rounded-xl border border-dashed border-[#e1e5ee] px-3 py-2 text-[0.8rem] text-gray-500">
                            {isProtectedUser
                              ? `Protected superadmin (${PROTECTED_SUPERADMIN_EMAIL}) cannot be changed.`
                              : 'Role editing requires `users:manage`.'}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-[0.72rem] font-medium ${planStyle.bg} ${planStyle.text}`}
                        >
                          {user.plan}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-[0.72rem] font-medium ${
                            isSuspended
                              ? 'bg-[#fdecec] text-[#b42318]'
                              : 'bg-[#ecfdf3] text-[#16784a]'
                          }`}
                        >
                          {isSuspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-[0.82rem] text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => toggleSuspend(user)}
                            disabled={actionId === user.id || !canManageUsers || isLocked}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e1e5ee] text-[#0f1116] transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label={isSuspended ? 'Activate user' : 'Suspend user'}
                            title={
                              isProtectedUser
                                ? 'Protected superadmin account'
                                : isSuspended
                                  ? 'Activate'
                                  : 'Suspend'
                            }
                          >
                            {isSuspended ? (
                              <MdPlayCircleOutline size={18} />
                            ) : (
                              <MdPauseCircleOutline size={18} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteUser(user)}
                            disabled={actionId === user.id || !canManageUsers || isLocked}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label="Delete user"
                            title={isProtectedUser ? 'Protected superadmin account' : 'Delete'}
                          >
                            <MdDeleteOutline size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                      No users match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isCreateOpen && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
              <div className="w-full max-w-2xl rounded-[20px] border border-[#e2e6ee] bg-white p-6 shadow-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-[1.3rem] font-medium text-[#0f1116]">Create new user</h2>
                    <p className="text-[0.85rem] text-gray-500">
                      Assign exactly one role to define their access.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="rounded-full border border-transparent p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Close"
                  >
                    <MdClose size={18} />
                  </button>
                </div>

                {createError && (
                  <div className="mt-4 rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-[0.85rem] text-red-700">
                    {createError}
                  </div>
                )}

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[0.8rem] font-medium text-[#0f1116]">Name</span>
                    <input
                      value={createForm.name}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="mt-2 w-full rounded-xl border border-[#e1e5ee] px-3 py-2 text-[0.9rem] text-[#0f1116]"
                      placeholder="Full name"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[0.8rem] font-medium text-[#0f1116]">Email</span>
                    <input
                      value={createForm.email}
                      onChange={(e) =>
                        setCreateForm((prev) => {
                          const nextEmail = e.target.value;
                          return {
                            ...prev,
                            email: nextEmail,
                            roleSelection:
                              prev.roleSelection === 'system:SUPERADMIN' &&
                              !isProtectedSuperadminEmail(nextEmail)
                                ? 'system:USER'
                                : prev.roleSelection,
                          };
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-[#e1e5ee] px-3 py-2 text-[0.9rem] text-[#0f1116]"
                      placeholder="user@company.com"
                      type="email"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[0.8rem] font-medium text-[#0f1116]">Password</span>
                    <input
                      value={createForm.password}
                      onChange={(e) =>
                        setCreateForm((prev) => ({ ...prev, password: e.target.value }))
                      }
                      className="mt-2 w-full rounded-xl border border-[#e1e5ee] px-3 py-2 text-[0.9rem] text-[#0f1116]"
                      placeholder="Optional"
                      type="password"
                    />
                    <p className="mt-1 text-[0.7rem] text-gray-400">
                      Leave blank if the user will sign in with Google.
                    </p>
                  </label>
                  <label className="block">
                    <span className="text-[0.8rem] font-medium text-[#0f1116]">Role</span>
                    <select
                      value={createForm.roleSelection}
                      onChange={(e) =>
                        setCreateForm((prev) => ({ ...prev, roleSelection: e.target.value }))
                      }
                      className="mt-2 w-full rounded-xl border border-[#e1e5ee] bg-white px-3 py-2 text-[0.9rem] text-[#0f1116]"
                    >
                      {combinedRoleOptions.map((option) => {
                        const isSuperadminOption =
                          option.kind === 'system' &&
                          option.label === 'SUPERADMIN' &&
                          !isProtectedSuperadminEmail(createForm.email);
                        return (
                          <option
                            key={option.value}
                            value={option.value}
                            disabled={isSuperadminOption}
                          >
                            {option.kind === 'custom' ? `Custom · ${option.label}` : option.label}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="rounded-xl border border-[#e1e5ee] px-4 py-2 text-[0.85rem] text-[#0f1116]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={createUser}
                    disabled={isCreating}
                    className="rounded-xl bg-[#0f1116] px-4 py-2 text-[0.85rem] font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-[#2f3340]"
                  >
                    {isCreating ? 'Creating...' : 'Create user'}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
      {dialog}
    </div>
  );
}
