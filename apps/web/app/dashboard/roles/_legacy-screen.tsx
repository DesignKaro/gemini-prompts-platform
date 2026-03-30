'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  MdAdd,
  MdClose,
  MdDeleteOutline,
  MdEdit,
  MdRefresh,
  MdSecurity,
  MdSearch,
} from 'react-icons/md';
import { useAdminApi } from '../../components/dashboard/use-admin-api';
import { ActionError } from '../../components/dashboard/action-error';
import { hasPermission } from '../../../lib/utils/permissions';
import { Skeleton } from '../../components/ui/skeleton';
import { useConfirmDialog } from '../../components/ui/confirm-dialog';

type Permission = {
  id: string;
  code: string;
  label: string;
  group: string;
  description?: string | null;
};

type RoleItem = {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  permissions: Permission[];
  createdAt?: string;
  updatedAt?: string;
};

const SYSTEM_TONES = [
  'bg-[#f5f0ff] text-[#5b33b8]',
  'bg-[#e8f2ff] text-[#1e4fd2]',
  'bg-[#ecfdf3] text-[#16784a]',
  'bg-[#fff4e6] text-[#b45309]',
  'bg-[#f3f4f6] text-[#4b5563]',
];

export default function RolesPage() {
  const { request, status } = useAdminApi();
  const { data: session } = useSession();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [permissionsRole, setPermissionsRole] = useState<RoleItem | null>(null);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [formState, setFormState] = useState({
    name: '',
    description: '',
    permissionCodes: [] as string[],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const canReadRoles = hasPermission(session, 'roles:read');
  const canReadPermissions = hasPermission(session, 'permissions:read');
  const canManageRoles = hasPermission(session, 'roles:manage');

  const loadRoles = async () => {
    if (status !== 'authenticated' || !canReadRoles) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const payload = await request<RoleItem[]>('/api/admin/roles', {
        actionName: 'dashboard.roles.list',
      });
      setRoles(payload ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { message?: string }).message;
      setLoadError(message || 'Unable to load roles.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPermissions = async () => {
    if (status !== 'authenticated' || !canReadPermissions) return;
    try {
      const payload = await request<Permission[]>('/api/admin/roles/permissions', {
        actionName: 'dashboard.permissions.list',
      });
      setPermissions(payload ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { message?: string }).message;
      setLoadError(message || 'Unable to load permissions.');
    }
  };

  useEffect(() => {
    loadRoles();
  }, [status, canReadRoles]);

  useEffect(() => {
    loadPermissions();
  }, [status, canReadPermissions]);

  const filteredRoles = useMemo(() => {
    if (!search.trim()) return roles;
    const q = search.toLowerCase();
    return roles.filter((role) =>
      [role.name, role.description, ...role.permissions.map((perm) => perm.label)]
        .filter(Boolean)
        .some((value) => (value ?? '').toLowerCase().includes(q)),
    );
  }, [roles, search]);

  const groupedPermissions = useMemo((): Array<[string, Permission[]]> => {
    const groups: Record<string, Permission[]> = {};
    permissions.forEach((permission) => {
      const key = permission.group || 'General';
      if (!groups[key]) groups[key] = [];
      groups[key].push(permission);
    });
    return Object.entries(groups)
      .map(
        ([group, perms]) =>
          [group, perms.sort((a, b) => a.label.localeCompare(b.label))] as [string, Permission[]],
      )
      .sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  const groupedRolePermissions = useMemo((): Array<[string, Permission[]]> => {
    if (!permissionsRole) return [];

    const groups: Record<string, Permission[]> = {};
    permissionsRole.permissions.forEach((permission) => {
      const key = permission.group || 'General';
      if (!groups[key]) groups[key] = [];
      groups[key].push(permission);
    });

    return Object.entries(groups)
      .map(
        ([group, perms]) =>
          [group, perms.sort((a, b) => a.label.localeCompare(b.label))] as [string, Permission[]],
      )
      .sort(([a], [b]) => a.localeCompare(b));
  }, [permissionsRole]);

  const openCreate = () => {
    setEditingRole(null);
    setFormState({ name: '', description: '', permissionCodes: [] });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEdit = (role: RoleItem) => {
    setEditingRole(role);
    setFormState({
      name: role.name,
      description: role.description ?? '',
      permissionCodes: role.permissions.map((permission) => permission.code),
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRole(null);
    setFormError(null);
    setIsSaving(false);
  };

  const closePermissionsModal = () => {
    setPermissionsRole(null);
  };

  const togglePermission = (code: string) => {
    setFormState((prev) => ({
      ...prev,
      permissionCodes: prev.permissionCodes.includes(code)
        ? prev.permissionCodes.filter((item) => item !== code)
        : [...prev.permissionCodes, code],
    }));
  };

  const saveRole = async () => {
    if (!canManageRoles) return;
    setIsSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: formState.name,
        description: formState.description || null,
        permissionCodes: formState.permissionCodes,
      };

      if (editingRole) {
        const updated = await request<RoleItem>(`/api/admin/roles/${editingRole.id}`, {
          method: 'PATCH',
          actionName: 'dashboard.roles.update',
          body: JSON.stringify(payload),
        });
        setRoles((prev) => prev.map((role) => (role.id === updated.id ? updated : role)));
      } else {
        const created = await request<RoleItem>('/api/admin/roles', {
          method: 'POST',
          actionName: 'dashboard.roles.create',
          body: JSON.stringify(payload),
        });
        setRoles((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }

      closeModal();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { message?: string }).message;
      setFormError(message || 'Unable to save role.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRole = async (role: RoleItem) => {
    if (!canManageRoles || role.isSystem) return;
    const ok = await confirm({
      title: 'Delete role',
      description: `Delete ${role.name}? This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await request(`/api/admin/roles/${role.id}`, {
        method: 'DELETE',
        actionName: 'dashboard.roles.delete',
      });
      setRoles((prev) => prev.filter((item) => item.id !== role.id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { message?: string }).message;
      setLoadError(message || 'Unable to delete role.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.8rem] font-medium tracking-tight text-[#0f1116]">Roles</h1>
          <p className="text-[0.95rem] text-gray-500">
            Create roles, assign permissions, and control dashboard visibility.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              loadRoles();
              loadPermissions();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] text-[#0f1116] transition-colors hover:bg-gray-50"
          >
            <MdRefresh size={16} />
            Refresh
          </button>
          <Link
            href="/dashboard/users"
            className="inline-flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] text-[#0f1116] transition-colors hover:bg-gray-50"
          >
            Manage Users
          </Link>
          <button
            type="button"
            onClick={openCreate}
            disabled={!canManageRoles}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0f1116] px-4 py-2 text-[0.85rem] font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-[#2f3340]"
          >
            <MdAdd size={16} />
            New Role
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
              placeholder="Search roles"
              className="w-full bg-transparent outline-none"
            />
          </div>
          <p className="text-[0.85rem] text-gray-500">{filteredRoles.length} roles</p>
        </div>

        {loadError && (
          <div className="mt-4">
            <ActionError error={loadError} />
          </div>
        )}

        {!canReadRoles && (
          <div className="mt-4 rounded-[14px] border border-[#e2e6ee] bg-[#f9fafc] px-4 py-3 text-[0.85rem] text-gray-600">
            You need `roles:read` to view role definitions.
          </div>
        )}

        {isLoading ? (
          <div className="mt-5 overflow-hidden rounded-[20px] border border-[#f0f4f8]">
            <table className="w-full text-left">
              <thead className="bg-[#f9fafb] border-b border-[#f0f4f8]">
                <tr className="text-[0.78rem] font-medium uppercase tracking-wide text-gray-400">
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Permissions</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`role-skeleton-${index}`} className="border-b border-[#f0f4f8] last:border-0">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <Skeleton className="h-4 w-48" />
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-16 rounded-full" />
                        <Skeleton className="h-6 w-16 rounded-full" />
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-2">
                        <Skeleton className="h-9 w-9 rounded-lg" />
                        <Skeleton className="h-9 w-9 rounded-lg" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-[20px] border border-[#f0f4f8]">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-[#f9fafb] border-b border-[#f0f4f8]">
                <tr className="text-[0.78rem] font-medium uppercase tracking-wide text-gray-400">
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Permissions</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f4f8]">
                {filteredRoles.map((role, index) => (
                  <tr
                    key={role.id}
                    className="group transition-colors hover:bg-gray-50/50"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                            SYSTEM_TONES[index % SYSTEM_TONES.length]
                          } shadow-sm`}
                        >
                          <MdSecurity size={18} />
                        </span>
                        <div>
                          <p className="text-[0.92rem] font-medium text-[#0f1116]">{role.name}</p>
                          {role.isSystem && (
                            <span className="inline-block mt-0.5 rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[0.65rem] font-medium text-[#4b5563]">
                              System role
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="max-w-[280px] truncate text-[0.88rem] text-gray-500" title={role.description ?? ''}>
                        {role.description || '—'}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-1.5">
                        {role.permissions.slice(0, 3).map((permission) => (
                          <span
                            key={permission.code}
                            className="rounded-full bg-[#f1f4f9] px-2.5 py-0.5 text-[0.7rem] font-medium text-[#5b6370]"
                          >
                            {permission.label}
                          </span>
                        ))}
                        {role.permissions.length > 3 && (
                          <button
                            type="button"
                            onClick={() => setPermissionsRole(role)}
                            className="rounded-full bg-gray-50 px-2.5 py-0.5 text-[0.7rem] font-medium text-gray-500 transition hover:bg-[#d5ea52] hover:text-[#0f1116]"
                          >
                            +{role.permissions.length - 3} more
                          </button>
                        )}
                        {!role.permissions.length && (
                          <span className="text-[0.8rem] text-gray-400 italic">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {canManageRoles && (
                        <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => openEdit(role)}
                            className="rounded-lg border border-[#e1e5ee] bg-white p-2 text-[#0f1116] shadow-sm transition hover:bg-gray-50"
                            aria-label="Edit role"
                          >
                            <MdEdit size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRole(role)}
                            disabled={role.isSystem}
                            className="rounded-lg border border-[#e1e5ee] bg-white p-2 text-[#0f1116] shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-300"
                            aria-label="Delete role"
                          >
                            <MdDeleteOutline size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!filteredRoles.length && !isLoading && canReadRoles && (
          <div className="mt-8 flex flex-col items-center justify-center rounded-[24px] border border-dashed border-[#e2e6ee] bg-gray-50/50 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
              <MdSecurity className="text-gray-300" size={24} />
            </div>
            <p className="mt-4 text-[0.95rem] font-medium text-[#0f1116]">No roles found</p>
            <p className="mt-1 text-[0.85rem] text-gray-500">
              Try adjusting your search criteria.
            </p>
          </div>
        )}
      </div>

      {isModalOpen && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
              <div className="w-full max-w-3xl rounded-[20px] border border-[#e2e6ee] bg-white p-6 shadow-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-[1.3rem] font-medium text-[#0f1116]">
                      {editingRole ? 'Edit role' : 'Create new role'}
                    </h2>
                    <p className="text-[0.85rem] text-gray-500">
                      {editingRole
                        ? 'Update permissions and descriptions.'
                        : 'Define the permissions available to this role.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-full border border-transparent p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Close"
                  >
                    <MdClose size={18} />
                  </button>
                </div>

                {formError && (
                  <div className="mt-4 rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-[0.85rem] text-red-700">
                    {formError}
                  </div>
                )}

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="space-y-4">
                    <label className="block">
                      <span className="text-[0.8rem] font-medium text-[#0f1116]">Role name</span>
                      <input
                        value={formState.name}
                        onChange={(e) =>
                          setFormState((prev) => ({ ...prev, name: e.target.value }))
                        }
                        disabled={editingRole?.isSystem}
                        className="mt-2 w-full rounded-xl border border-[#e1e5ee] px-3 py-2 text-[0.9rem] text-[#0f1116] disabled:bg-gray-100"
                        placeholder="e.g. Support Lead"
                      />
                      {editingRole?.isSystem && (
                        <p className="mt-1 text-[0.75rem] text-gray-400">
                          System role names are locked.
                        </p>
                      )}
                    </label>
                    <label className="block">
                      <span className="text-[0.8rem] font-medium text-[#0f1116]">Description</span>
                      <textarea
                        value={formState.description}
                        onChange={(e) =>
                          setFormState((prev) => ({ ...prev, description: e.target.value }))
                        }
                        className="mt-2 min-h-[120px] w-full rounded-xl border border-[#e1e5ee] px-3 py-2 text-[0.9rem] text-[#0f1116]"
                        placeholder="Describe who this role is for"
                      />
                    </label>
                    <div className="rounded-[14px] border border-[#e2e6ee] bg-[#f9fafc] px-4 py-3 text-[0.85rem] text-gray-600">
                      Selected {formState.permissionCodes.length} permissions
                    </div>
                  </div>

                  <div>
                    <div className="no-scrollbar max-h-[360px] space-y-4 overflow-y-auto pr-1">
                      {groupedPermissions.length ? (
                        groupedPermissions.map(([group, perms]) => (
                          <div key={group}>
                            <p className="text-[0.8rem] font-medium uppercase tracking-wide text-gray-500">
                              {group}
                            </p>
                            <div className="mt-2 space-y-2">
                              {perms.map((permission) => (
                                <label
                                  key={permission.code}
                                  className="flex items-start gap-3 rounded-[14px] border border-[#e8edf4] bg-white px-4 py-3 text-[0.85rem] text-[#1b2028]"
                                >
                                  <input
                                    type="checkbox"
                                    checked={formState.permissionCodes.includes(permission.code)}
                                    onChange={() => togglePermission(permission.code)}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-[#0f1116]"
                                  />
                                  <span>
                                    <span className="block text-[0.85rem] font-medium">
                                      {permission.label}
                                    </span>
                                    <span className="block text-[0.75rem] text-gray-500">
                                      {permission.description || permission.code}
                                    </span>
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[14px] border border-dashed border-[#e1e5ee] px-4 py-3 text-[0.85rem] text-gray-500">
                          {canReadPermissions
                            ? 'No permissions available.'
                            : 'You need `permissions:read` to edit role permissions.'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-[#e1e5ee] px-4 py-2 text-[0.85rem] text-[#0f1116]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveRole}
                    disabled={isSaving || !canManageRoles}
                    className="rounded-xl bg-[#0f1116] px-4 py-2 text-[0.85rem] font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-[#2f3340]"
                  >
                    {isSaving ? 'Saving...' : 'Save role'}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
      {permissionsRole && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4"
              onClick={closePermissionsModal}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label={`${permissionsRole.name} permissions`}
                className="w-full max-w-2xl rounded-[24px] border border-[#e2e6ee] bg-white p-6 shadow-[0_24px_80px_rgba(15,17,22,0.18)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-[1.3rem] font-medium text-[#0f1116]">
                      {permissionsRole.name} permissions
                    </h2>
                    <p className="mt-1 text-[0.9rem] text-gray-500">
                      Showing all {permissionsRole.permissions.length} permissions assigned to this
                      role.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closePermissionsModal}
                    className="rounded-full border border-transparent p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Close permissions modal"
                  >
                    <MdClose size={18} />
                  </button>
                </div>

                <div className="no-scrollbar mt-5 max-h-[65vh] space-y-4 overflow-y-auto pr-1">
                  {groupedRolePermissions.length ? (
                    groupedRolePermissions.map(([group, perms]) => (
                      <div
                        key={group}
                        className="rounded-[18px] border border-[#eef2f7] bg-[#fbfcfe] p-4"
                      >
                        <p className="text-[0.78rem] font-medium uppercase tracking-[0.18em] text-[#8b93a3]">
                          {group}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {perms.map((permission) => (
                            <div
                              key={permission.code}
                              className="min-w-[180px] rounded-[14px] border border-[#e8edf4] bg-white px-3 py-2"
                            >
                              <p className="text-[0.82rem] font-medium text-[#0f1116]">
                                {permission.label}
                              </p>
                              <p className="mt-1 text-[0.74rem] text-gray-500">
                                {permission.description || permission.code}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[18px] border border-dashed border-[#e1e5ee] px-4 py-6 text-center text-[0.9rem] text-gray-500">
                      This role does not have any permissions assigned.
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={closePermissionsModal}
                    className="rounded-xl bg-[#0f1116] px-4 py-2 text-[0.85rem] font-medium text-white transition hover:bg-black"
                  >
                    Close
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
