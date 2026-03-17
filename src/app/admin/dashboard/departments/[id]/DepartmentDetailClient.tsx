'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  BuildingOfficeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  UserIcon,
  FolderIcon,
  Squares2X2Icon,
  ChevronRightIcon,
  ArrowLeftIcon,
  EyeIcon,
  EyeSlashIcon,
  LockOpenIcon,
  ChevronLeftIcon,
  EnvelopeIcon,
  KeyIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import GroupAccessModal from '@/components/GroupAccessModal';

type GroupFieldType = 'TEXT' | 'PASSWORD' | 'URL' | 'EMAIL' | 'NUMBER' | 'TEXTAREA';

interface GroupFieldDefinition {
  name: string;
  type: GroupFieldType;
  required: boolean;
  encrypted: boolean;
  placeholder?: string;
  order: number;
}

interface DepartmentDetailClientProps {
  department: {
    id: string;
    name: string;
    description: string | null;
    admin: { id: string; name: string; email: string; role: string };
    parent: { id: string; name: string } | null;
    children: Array<{
      id: string;
      name: string;
      description: string | null;
      admin: { name: string; email: string };
      _count: { groups: number; users: number };
    }>;
    groups: Array<{
      id: string;
      name: string;
      description: string | null;
      _count: { items: number; userAccess: number };
    }>;
    _count: { groups: number; users: number };
  };
  isSuperAdmin: boolean;
  isSupervisor?: boolean;
  canManageAccess?: boolean;
  canEditDeleteGroups?: boolean;
}

export default function DepartmentDetailClient({
  department,
  isSuperAdmin,
  isSupervisor = false,
  canManageAccess = true,
  canEditDeleteGroups = true,
}: DepartmentDetailClientProps) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddSubModal, setShowAddSubModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [showGrantAccessModal, setShowGrantAccessModal] = useState(false);
  const [groupForAccess, setGroupForAccess] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [groupToDelete, setGroupToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [groupDeleteLoading, setGroupDeleteLoading] = useState(false);
  const [groupDeleteError, setGroupDeleteError] = useState('');

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/departments/${department.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      toast.success('Department deleted successfully');
      router.push('/admin/dashboard?tab=departments');
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete';
      setError(msg);
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;
    setGroupDeleteLoading(true);
    setGroupDeleteError('');
    try {
      const res = await fetch(`/api/groups/${groupToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete group');
      }
      toast.success('Group deleted successfully');
      setGroupToDelete(null);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete group';
      setGroupDeleteError(msg);
      toast.error(msg);
    } finally {
      setGroupDeleteLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Breadcrumbs - hide department names for supervisor (no department permission) */}
      <nav className="mb-6 text-sm text-slate-500 flex items-center gap-2">
        {isSupervisor ? (
          <Link
            href="/admin/dashboard"
            className="hover:text-slate-900 font-medium"
          >
            Dashboard
          </Link>
        ) : (
          <>
            {isSuperAdmin && (
              <>
                <Link
                  href="/admin/dashboard?tab=departments"
                  className="hover:text-slate-900 font-medium"
                >
                  Departments
                </Link>
                <span className="text-slate-400">/</span>
              </>
            )}
            {department.parent && (
              <>
                <Link
                  href={`/admin/dashboard/departments/${department.parent.id}`}
                  className="hover:text-slate-900 font-medium"
                >
                  {department.parent.name}
                </Link>
                <span className="text-slate-400">/</span>
              </>
            )}
            <span className="text-slate-700 font-semibold truncate">
              {department.name}
            </span>
          </>
        )}
      </nav>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <BuildingOfficeIcon className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{department.name}</h1>
                {department.description && (
                  <p className="text-slate-600 mt-1">{department.description}</p>
                )}
                <div className="flex items-center gap-2 mt-3 text-sm text-slate-500">
                  <UserIcon className="h-4 w-4" />
                  <span>
                    Admin: {department.admin.name} ({department.admin.email})
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
              {/* Primary Actions Group */}
              <div className="flex flex-wrap items-center gap-2">
                {!department.parent && (isSuperAdmin || canManageAccess) && (
                  <button
                    onClick={() => setShowAddSubModal(true)}
                    className="inline-flex items-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-bold uppercase tracking-widest hover:from-amber-600 hover:to-yellow-600 shadow-md shadow-amber-200 transition-all active:scale-95"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add sub-department
                  </button>
                )}
                <button
                  onClick={() => setShowAddGroupModal(true)}
                  className="inline-flex items-center px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 shadow-md shadow-blue-200 transition-all active:scale-95"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add group
                </button>
                {canManageAccess && (
                  <button
                    onClick={() => setShowGrantAccessModal(true)}
                    className="inline-flex items-center px-4 py-2.5 rounded-xl border-2 border-blue-600 bg-white text-blue-600 text-xs font-bold uppercase tracking-widest hover:bg-blue-50 transition-all active:scale-95"
                  >
                    <LockOpenIcon className="h-4 w-4 mr-2" />
                    Grant access
                  </button>
                )}
              </div>

              {/* Administrative Actions Group */}
              <div className="flex items-center gap-2 sm:border-l sm:border-slate-200 sm:pl-3">
                {(isSuperAdmin || (canManageAccess && department.parent && !isSupervisor)) && (
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all active:scale-95"
                    title="Edit Department"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                )}
                {(isSuperAdmin || (canManageAccess && department.parent && !isSupervisor)) && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all active:scale-95"
                    title="Delete Department"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View sub-departments (only for top-level departments) & groups */}
      <div className={`grid gap-6 ${department.parent ? 'lg:grid-cols-1' : 'lg:grid-cols-2'}`}>
        {!department.parent && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <FolderIcon className="h-5 w-5 text-amber-600" />
                Sub-departments
              </h2>
              <span className="text-sm text-slate-500">{department.children.length} total</span>
            </div>
            <div className="p-6">
              {department.children.length === 0 ? (
                <p className="text-slate-500 text-sm">No sub-departments.</p>
              ) : (
                <ul className="space-y-3">
                  {department.children.map((child) => (
                    <li key={child.id}>
                      <Link
                        href={`/admin/dashboard/departments/${child.id}`}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{child.name}</p>
                          <p className="text-xs text-slate-500">
                            {child._count.groups} groups · {child._count.users} users
                          </p>
                        </div>
                        <ChevronRightIcon className="h-5 w-5 text-slate-400" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Squares2X2Icon className="h-5 w-5 text-blue-600" />
              Groups
            </h2>
            <span className="text-sm text-slate-500">{department.groups.length} total</span>
          </div>
          <div className="p-6">
            {department.groups.length === 0 ? (
              <p className="text-slate-500 text-sm">No groups yet.</p>
            ) : (
              <ul className="space-y-3">
                {department.groups.map((group) => (
                  <li key={group.id}>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-colors">
                      <Link
                        href={`/admin/dashboard/groups/${group.id}/items`}
                        className="flex-1 flex items-center justify-between gap-2"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{group.name}</p>
                          <p className="text-xs text-slate-500">
                            {group._count.items} items · {group._count.userAccess} access
                          </p>
                        </div>
                        <ChevronRightIcon className="h-5 w-5 text-slate-400" />
                      </Link>
                      <div className="ml-3 flex items-center gap-2">
                        {(canManageAccess || canEditDeleteGroups) && (
                          <button
                            type="button"
                            onClick={() =>
                              setGroupForAccess({ id: group.id, name: group.name })
                            }
                            className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Manage access
                          </button>
                        )}
                        {canEditDeleteGroups && (
                          <>
                            <Link
                              href={`/admin/dashboard/groups/${group.id}`}
                              className="p-2 rounded-md border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-colors"
                              title="Edit group"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() =>
                                setGroupToDelete({ id: group.id, name: group.name })
                              }
                              className="p-2 rounded-md border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 transition-colors"
                              title="Delete group"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 lg:left-64 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900">Delete department?</h3>
            <p className="text-slate-600 mt-2">
              This will delete &quot;{department.name}&quot; and cannot be undone.
            </p>
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowDeleteConfirm(false); setError(''); }}
                className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal - placeholder: redirect to list with edit state or inline form */}
      {showEditModal && (
        <EditDepartmentModal
          department={department}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            router.refresh();
          }}
        />
      )}

      {showAddSubModal && (
        <AddSubDepartmentModal
          parentId={department.id}
          parentName={department.name}
          onClose={() => setShowAddSubModal(false)}
          onSuccess={() => {
            setShowAddSubModal(false);
            router.refresh();
          }}
        />
      )}

      {showAddGroupModal && (
        <AddGroupModal
          departmentId={department.id}
          departmentName={department.name}
          onClose={() => setShowAddGroupModal(false)}
          onSuccess={() => {
            setShowAddGroupModal(false);
            router.refresh();
          }}
        />
      )}

      {showGrantAccessModal && (
        <GrantAccessModal
          departmentId={department.id}
          departmentName={department.name}
          isSubDepartment={!!department.parent}
          onClose={() => setShowGrantAccessModal(false)}
          onSuccess={() => router.refresh()}
        />
      )}

      {groupForAccess && (
        <GroupAccessModal
          groupId={groupForAccess.id}
          groupName={groupForAccess.name}
          departmentPath={department.parent ? `${department.parent.name} › ${department.name}` : department.name}
          onClose={() => setGroupForAccess(null)}
        />
      )}

      {groupToDelete && (
        <div className="fixed inset-0 lg:left-64 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900">
              Delete group?
            </h3>
            <p className="text-slate-600 mt-2">
              This will delete &quot;{groupToDelete.name}&quot; and all of its items.
              This action cannot be undone.
            </p>
            {groupDeleteError && (
              <p className="text-red-600 text-sm mt-2">{groupDeleteError}</p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  if (!groupDeleteLoading) {
                    setGroupToDelete(null);
                    setGroupDeleteError('');
                  }
                }}
                className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50"
                disabled={groupDeleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteGroup}
                disabled={groupDeleteLoading}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {groupDeleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditDepartmentModal({
  department,
  onClose,
  onSuccess,
}: {
  department: DepartmentDetailClientProps['department'];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(department.name);
  const [description, setDescription] = useState(department.description || '');
  const [adminName, setAdminName] = useState(department.admin.name);
  const [adminEmail, setAdminEmail] = useState(department.admin.email);
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/departments/${department.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          adminName,
          adminEmail,
          ...(adminPassword ? { adminPassword } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      toast.success('Department updated successfully');
      onSuccess();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Update failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 lg:left-64 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Edit department</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Admin name</label>
            <input
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Admin email</label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New password (optional)</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddSubDepartmentModal({
  parentId,
  parentName,
  onClose,
  onSuccess,
}: {
  parentId: string;
  parentName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const validatePassword = (pass: string) => {
    if (pass.length > 0 && pass.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
    } else {
      setPasswordError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          parentId,
          adminName,
          adminEmail,
          adminPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      toast.success('Sub-department created successfully');
      onSuccess();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Create failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 lg:left-64 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            Add sub-department
          </h3>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Under {parentName}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Department Details Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg ring-4 ring-blue-50/50">
                  <BuildingOfficeIcon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 tracking-tight text-sm">Sub-department Details</h4>
                  <div className="h-0.5 w-8 bg-blue-500 mt-1 rounded-full"></div>
                </div>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group/input">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-blue-500 transition-colors">
                      <BuildingOfficeIcon className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-slate-50/30"
                      placeholder="e.g., UI/UX Design"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
                    Description
                  </label>
                  <div className="relative group/input">
                    <div className="absolute left-4 top-4 text-slate-400 group-focus-within/input:text-blue-500 transition-colors">
                      <ClipboardDocumentIcon className="h-5 w-5" />
                    </div>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={5}
                      className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400 resize-none bg-slate-50/30"
                      placeholder="Briefly describe the sub-department's role..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Administrator Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg ring-4 ring-amber-50/50">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 tracking-tight text-sm">Administrator</h4>
                  <div className="h-0.5 w-8 bg-amber-500 mt-1 rounded-full"></div>
                </div>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
                    Admin name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group/input">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-amber-500 transition-colors">
                      <UserIcon className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      required
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-50 focus:border-amber-500 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-slate-50/30"
                      placeholder="e.g., John Smith"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
                    Admin email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group/input">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-amber-500 transition-colors">
                      <EnvelopeIcon className="h-5 w-5" />
                    </div>
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-50 focus:border-amber-500 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-slate-50/30"
                      placeholder="admin@organization.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
                    Admin password <span className="text-red-500">*</span>
                  </label>
                  
                  <div className="relative group/input">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-amber-500 transition-colors">
                      <KeyIcon className="h-5 w-5" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={adminPassword}
                      onChange={(e) => {
                        setAdminPassword(e.target.value);
                        validatePassword(e.target.value);
                      }}
                      className={`w-full pl-12 pr-12 py-3.5 border rounded-xl focus:ring-4 focus:ring-amber-50 focus:border-amber-500 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-slate-50/30 ${
                        passwordError ? 'border-red-300' : 'border-slate-200'
                      }`}
                      placeholder="Secure password"
                    />
                    {adminPassword && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-amber-600 transition-colors"
                      >
                        {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                      </button>
                    )}
                  </div>
                  
                  {passwordError ? (
                    <p className="text-[10px] text-red-500 mt-2 leading-relaxed font-semibold animate-in fade-in slide-in-from-left-2">
                       {passwordError}
                    </p>
                  ) : (
                    <div className="flex items-start gap-2 mt-3 ml-1">
                      <div className="mt-0.5 p-0.5 bg-slate-100 rounded text-slate-400">
                        <ClipboardDocumentIcon className="h-3 w-3" />
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                        Minimum 8 characters. Must contain alpha-numeric and special characters.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-8 bg-slate-50/50 border-t border-slate-100 -mx-8 -mb-8 p-8">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !!passwordError}
              className="px-8 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddGroupModal({
  departmentId,
  departmentName,
  onClose,
  onSuccess,
}: {
  departmentId: string;
  departmentName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fieldDefinitions, setFieldDefinitions] = useState<GroupFieldDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fieldTypes: { value: GroupFieldType; label: string }[] = [
    { value: 'TEXT', label: 'Text' },
    { value: 'PASSWORD', label: 'Password' },
    { value: 'URL', label: 'URL' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'NUMBER', label: 'Number' },
    { value: 'TEXTAREA', label: 'Long text' },
  ];

  const addField = () => {
    setFieldDefinitions((prev) => [
      ...prev,
      {
        name: '',
        type: 'TEXT',
        required: false,
        encrypted: false,
        placeholder: '',
        order: prev.length,
      },
    ]);
  };

  const updateField = (index: number, patch: Partial<GroupFieldDefinition>) => {
    setFieldDefinitions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const removeField = (index: number) => {
    setFieldDefinitions((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((field, i) => ({ ...field, order: i }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fieldDefinitions.length === 0) {
      setError('Please add at least one field to the group.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          departmentId,
          fieldDefinitions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      toast.success('Group created successfully');
      onSuccess();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Create failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 lg:left-64 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Add Group</h3>
          <p className="text-sm font-medium text-slate-500 mt-1">In {departmentName}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Group General Details */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg ring-4 ring-blue-50/50">
                  <Squares2X2Icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 tracking-tight text-sm">General Details</h4>
                  <div className="h-0.5 w-8 bg-blue-500 mt-1 rounded-full"></div>
                </div>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
                    Group Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group/input">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-blue-500 transition-colors">
                      <BuildingOfficeIcon className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-slate-50/30"
                      placeholder="e.g., AWS Environment"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
                    Description
                  </label>
                  <div className="relative group/input">
                    <div className="absolute left-4 top-4 text-slate-400 group-focus-within/input:text-blue-500 transition-colors">
                      <ClipboardDocumentIcon className="h-5 w-5" />
                    </div>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400 resize-none bg-slate-50/30"
                      placeholder="Briefly describe what this group handles..."
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Fields Definition Section */}
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg ring-4 ring-indigo-50/50">
                  <ClipboardDocumentIcon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 tracking-tight text-sm">Group Schema (Fields)</h4>
                  <div className="h-0.5 w-8 bg-indigo-500 mt-1 rounded-full"></div>
                </div>
              </div>
              <button
                type="button"
                onClick={addField}
                className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95 group/btn"
              >
                <PlusIcon className="h-4 w-4 mr-2 group-hover/btn:rotate-90 transition-transform" />
                Add New Field
              </button>
            </div>

            {fieldDefinitions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-[1.5rem] bg-slate-50/50">
                <div className="p-3 bg-white rounded-full shadow-sm mb-3">
                  <PlusIcon className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-sm text-slate-500 font-medium">No fields defined yet.</p>
                <p className="text-xs text-slate-400 mt-1">Capture group-specific data by adding fields.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {fieldDefinitions.map((field, index) => (
                  <div
                    key={index}
                    className="group/field relative bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm hover:border-indigo-200 transition-all hover:shadow-md"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="md:col-span-1">
                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 ml-1">
                          Field Name
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={field.name}
                            onChange={(e) => updateField(index, { name: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all"
                            placeholder="e.g., API Key"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-1">
                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 ml-1">
                          Type
                        </label>
                        <select
                          value={field.type}
                          onChange={(e) =>
                            updateField(index, { type: e.target.value as GroupFieldType })
                          }
                          className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                        >
                          {fieldTypes.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-1">
                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 ml-1">
                          Placeholder
                        </label>
                        <input
                          type="text"
                          value={field.placeholder || ''}
                          onChange={(e) => updateField(index, { placeholder: e.target.value })}
                          className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all"
                          placeholder="User hint"
                        />
                      </div>

                      <div className="md:col-span-1 flex flex-col justify-center gap-3 pr-8">
                        <label className="inline-flex items-center gap-3 cursor-pointer group/check">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateField(index, { required: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-colors"
                          />
                          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Required</span>
                        </label>
                        <label className="inline-flex items-center gap-3 cursor-pointer group/check">
                          <input
                            type="checkbox"
                            checked={field.encrypted}
                            onChange={(e) => updateField(index, { encrypted: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 transition-colors"
                          />
                          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Encrypted</span>
                        </label>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeField(index)}
                      className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 transition-colors"
                      title="Remove Field"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-8 bg-slate-50/50 border-t border-slate-100 -mx-8 -mb-8 p-8">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-10 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

function GrantAccessModal({
  departmentId,
  departmentName,
  isSubDepartment,
  onClose,
  onSuccess,
}: {
  departmentId: string;
  departmentName: string;
  isSubDepartment: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [grantedPage, setGrantedPage] = useState(1);
  const [grantedData, setGrantedData] = useState<{
    items: Array<{ id: string; name: string; email: string; role: string; directGrant: boolean }>;
    total: number;
    totalPages: number;
  } | null>(null);
  const [grantedLoading, setGrantedLoading] = useState(true);
  const [notGrantedPage, setNotGrantedPage] = useState(1);
  const [notGrantedData, setNotGrantedData] = useState<{
    items: Array<{ id: string; name: string; email: string; role: string }>;
    total: number;
    totalPages: number;
  } | null>(null);
  const [notGrantedLoading, setNotGrantedLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'grant' | 'revoke';
    userId: string;
    name: string;
    email: string;
  } | null>(null);

  const fetchGranted = async (page: number) => {
    setGrantedLoading(true);
    try {
      const res = await fetch(
        `/api/admin/departments/${departmentId}/access?section=granted&page=${page}&limit=${PAGE_SIZE}&search=${encodeURIComponent(
          search.trim()
        )}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setGrantedData(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load granted users';
      setError(msg);
      toast.error(msg);
      setGrantedData({ items: [], total: 0, totalPages: 0 });
    } finally {
      setGrantedLoading(false);
    }
  };

  const fetchNotGranted = async (page: number) => {
    setNotGrantedLoading(true);
    try {
      const res = await fetch(
        `/api/admin/departments/${departmentId}/access?section=not_granted&page=${page}&limit=${PAGE_SIZE}&search=${encodeURIComponent(
          search.trim()
        )}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setNotGrantedData(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load users';
      setError(msg);
      toast.error(msg);
      setNotGrantedData({ items: [], total: 0, totalPages: 0 });
    } finally {
      setNotGrantedLoading(false);
    }
  };

  const loadBoth = () => {
    fetchGranted(grantedPage);
    fetchNotGranted(notGrantedPage);
  };

  useEffect(() => {
    fetchGranted(grantedPage);
    fetchNotGranted(notGrantedPage);
  }, [grantedPage, notGrantedPage, search]);

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setGrantedPage(1);
    setNotGrantedPage(1);
    setSearch(searchInput);
  };

  const handleGrant = async (userId: string) => {
    setActionLoading(userId);
    setError('');
    try {
      const res = await fetch(`/api/admin/departments/${departmentId}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Grant failed');
      toast.success('Access granted successfully');
      loadBoth();
      onSuccess();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Grant failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (userId: string) => {
    setActionLoading(userId);
    setError('');
    try {
      const res = await fetch(`/api/admin/departments/${departmentId}/access/${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Revoke failed');
      toast.success('Access revoked successfully');
      loadBoth();
      onSuccess();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Revoke failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 lg:left-64 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl md:w-11/12 max-h-[90vh] flex flex-col my-8">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Grant access</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {departmentName}
              {isSubDepartment ? ' (sub-department)' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            ×
          </button>
        </div>
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}
        <form onSubmit={applySearch} className="mx-6 mt-4 mb-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="text-xs font-medium text-slate-600 sm:w-32">Search users</label>
          <div className="flex flex-1 gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or email"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
            >
              Apply
            </button>
          </div>
        </form>
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex flex-col gap-6 md:flex-row">
          <section className="md:w-1/2 md:min-w-0">
            <h4 className="font-medium text-slate-900 mb-2">Granted users</h4>
            {grantedLoading ? (
              <p className="text-slate-500 text-sm">Loading...</p>
            ) : grantedData && grantedData.items.length === 0 ? (
              <p className="text-slate-500 text-sm">No users granted access yet.</p>
            ) : grantedData ? (
              <>
                <div className="border border-slate-200 rounded-lg overflow-hidden w-full overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium text-slate-700">Name</th>
                        <th className="text-left py-2 px-3 font-medium text-slate-700">Email</th>
                        <th className="text-left py-2 px-3 font-medium text-slate-700">Role</th>
                        <th className="w-24" />
                      </tr>
                    </thead>
                    <tbody>
                      {grantedData.items.map((u) => (
                        <tr key={u.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-2 px-3 text-slate-900">{u.name}</td>
                          <td className="py-2 px-3 text-slate-600 break-all">{u.email}</td>
                          <td className="py-2 px-3 text-slate-600">{u.role}</td>
                          <td className="py-2 px-3">
                            {u.directGrant ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmAction({
                                    type: 'revoke',
                                    userId: u.id,
                                    name: u.name,
                                    email: u.email,
                                  })
                                }
                                disabled={actionLoading !== null}
                                className="text-red-600 hover:underline text-xs font-medium disabled:opacity-50"
                              >
                                {actionLoading === u.id ? 'Revoking...' : 'Revoke'}
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">Via parent</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {grantedData.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-500">
                      {grantedData.total} total
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setGrantedPage((p) => Math.max(1, p - 1))}
                        disabled={grantedPage <= 1}
                        className="p-1.5 rounded border border-slate-200 disabled:opacity-50"
                      >
                        <ChevronLeftIcon className="h-4 w-4" />
                      </button>
                      <span className="px-2 py-1 text-sm text-slate-600">
                        {grantedPage} / {grantedData.totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setGrantedPage((p) => Math.min(grantedData.totalPages, p + 1))}
                        disabled={grantedPage >= grantedData.totalPages}
                        className="p-1.5 rounded border border-slate-200 disabled:opacity-50"
                      >
                        <ChevronRightIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </section>
          <section className="md:w-1/2 md:min-w-0">
            <h4 className="font-medium text-slate-900 mb-2">Not granted (eligible)</h4>
            {notGrantedLoading ? (
              <p className="text-slate-500 text-sm">Loading...</p>
            ) : notGrantedData && notGrantedData.items.length === 0 ? (
              <p className="text-slate-500 text-sm">No eligible users or all have been granted.</p>
            ) : notGrantedData ? (
              <>
                <div className="border border-slate-200 rounded-lg overflow-hidden w-full overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium text-slate-700">Name</th>
                        <th className="text-left py-2 px-3 font-medium text-slate-700">Email</th>
                        <th className="text-left py-2 px-3 font-medium text-slate-700">Role</th>
                        <th className="w-24" />
                      </tr>
                    </thead>
                    <tbody>
                      {notGrantedData.items.map((u) => (
                        <tr key={u.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-2 px-3 text-slate-900">{u.name}</td>
                          <td className="py-2 px-3 text-slate-600 break-all">{u.email}</td>
                          <td className="py-2 px-3 text-slate-600">{u.role}</td>
                          <td className="py-2 px-3">
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmAction({
                                  type: 'grant',
                                  userId: u.id,
                                  name: u.name,
                                  email: u.email,
                                })
                              }
                              disabled={actionLoading !== null}
                              className="text-amber-600 hover:underline text-xs font-medium disabled:opacity-50"
                            >
                              {actionLoading === u.id ? 'Granting...' : 'Grant'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {notGrantedData.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-500">
                      {notGrantedData.total} total
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setNotGrantedPage((p) => Math.max(1, p - 1))}
                        disabled={notGrantedPage <= 1}
                        className="p-1.5 rounded border border-slate-200 disabled:opacity-50"
                      >
                        <ChevronLeftIcon className="h-4 w-4" />
                      </button>
                      <span className="px-2 py-1 text-sm text-slate-600">
                        {notGrantedPage} / {notGrantedData.totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setNotGrantedPage((p) => Math.min(notGrantedData.totalPages, p + 1))}
                        disabled={notGrantedPage >= notGrantedData.totalPages}
                        className="p-1.5 rounded border border-slate-200 disabled:opacity-50"
                      >
                        <ChevronRightIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </section>
          </div>
        </div>
      </div>
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {confirmAction.type === 'grant' ? 'Grant access?' : 'Revoke access?'}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              {confirmAction.type === 'grant'
                ? `Grant department${isSubDepartment ? ' (sub-department)' : ''} access to ${confirmAction.name} (${confirmAction.email})? They will inherit access to all groups under this department.`
                : `Revoke direct department${isSubDepartment ? ' (sub-department)' : ''} access from ${confirmAction.name} (${confirmAction.email})? They may still have access via other grants.`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
                disabled={actionLoading !== null}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!confirmAction) return;
                  if (confirmAction.type === 'grant') {
                    handleGrant(confirmAction.userId);
                  } else {
                    handleRevoke(confirmAction.userId);
                  }
                  setConfirmAction(null);
                }}
                disabled={actionLoading !== null}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {confirmAction.type === 'grant' ? 'Confirm grant' : 'Confirm revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
