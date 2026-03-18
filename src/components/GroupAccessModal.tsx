'use client';

import { useEffect, useState } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  UserIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  RectangleGroupIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

interface GroupAccessModalProps {
  groupId: string;
  groupName: string;
  departmentPath?: string;
  onClose: () => void;
}

const PAGE_SIZE = 10;

export default function GroupAccessModal({
  groupId,
  groupName,
  departmentPath,
  onClose,
}: GroupAccessModalProps) {
  const [grantedPage, setGrantedPage] = useState(1);
  const [notGrantedPage, setNotGrantedPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [grantedData, setGrantedData] = useState<{
    items: Array<{ id: string; name: string; email: string; role: string; directGrant?: boolean }>;
    total: number;
    totalPages: number;
  } | null>(null);
  const [notGrantedData, setNotGrantedData] = useState<{
    items: Array<{ id: string; name: string; email: string; role: string }>;
    total: number;
    totalPages: number;
  } | null>(null);
  const [grantedLoading, setGrantedLoading] = useState(true);
  const [notGrantedLoading, setNotGrantedLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'grant' | 'revoke';
    userId: string;
    name: string;
    email: string;
    role: string;
  } | null>(null);

  const buildUrl = (section: 'granted' | 'not_granted', page: number) => {
    const params = new URLSearchParams({
      section,
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    if (search.trim()) {
      params.set('search', search.trim());
    }
    return `/api/groups/${groupId}/access?${params.toString()}`;
  };

  const fetchGranted = async (page: number) => {
    setGrantedLoading(true);
    try {
      const res = await fetch(buildUrl('granted', page));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load granted users');
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
      const res = await fetch(buildUrl('not_granted', page));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load users');
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

  const handleGrant = async (userId: string, role: string, name: string, email: string) => {
    setActionLoading(userId);
    setError('');
    try {
      const res = await fetch(`/api/groups/${groupId}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Grant failed');
      toast.success('Access granted to group');
      setNotGrantedData((prev) => {
        if (!prev) return prev;
        const items = prev.items.filter((u) => u.id !== userId);
        const total = Math.max(0, prev.total - 1);
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        return { items, total, totalPages };
      });
      setGrantedData((prev) => {
        if (!prev) return { items: [], total: 0, totalPages: 0 };
        const newItem = { id: userId, name, email, role, directGrant: true as const };
        const items = [newItem, ...prev.items];
        const total = prev.total + 1;
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        return { items, total, totalPages };
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Grant failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (userId: string, role: string, name: string, email: string) => {
    setActionLoading(userId);
    setError('');
    try {
      const res = await fetch(`/api/groups/${groupId}/access`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Revoke failed');
      toast.success('Access revoked from group');
      setGrantedData((prev) => {
        if (!prev) return prev;
        const items = prev.items.filter((u) => u.id !== userId);
        const total = Math.max(0, prev.total - 1);
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        return { items, total, totalPages };
      });
      setNotGrantedData((prev) => {
        if (!prev) return prev;
        const newItem = { id: userId, name, email, role };
        const items = [newItem, ...prev.items];
        const total = prev.total + 1;
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        return { items, total, totalPages };
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Revoke failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setGrantedPage(1);
    setNotGrantedPage(1);
    setSearch(searchInput);
  };

  return (
    <div className="fixed inset-0 lg:left-64 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] w-full max-w-5xl max-h-[90vh] flex flex-col my-8 border border-slate-200/50 overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/60 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-100 text-purple-600 ring-4 ring-purple-50">
              <RectangleGroupIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Manage group access</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {groupName}
                {departmentPath ? ` · ${departmentPath}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mx-8 mt-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        <form onSubmit={applySearch} className="mx-8 mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5" />
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or email"
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-purple-100 focus:border-purple-500 bg-slate-50/50 transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-3 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 shadow-lg shadow-purple-200/50 transition-all active:scale-[0.98]"
          >
            Search
          </button>
        </form>

        <div className="p-8 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-emerald-50/50 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600">
                  <ShieldCheckIcon className="h-4 w-4" />
                </div>
                <h4 className="font-semibold text-slate-800">With access</h4>
              </div>
              <div className="p-4 min-h-[200px]">
                {grantedLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500 mb-3" />
                    <p className="text-sm font-medium">Loading...</p>
                  </div>
                ) : grantedData && grantedData.items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <UserIcon className="h-10 w-10 text-slate-300 mb-2" />
                    <p className="text-sm font-medium">No explicit group access yet</p>
                  </div>
                ) : grantedData ? (
                  <>
                    <ul className="space-y-2">
                      {grantedData.items.map((u) => (
                        <li
                          key={u.id}
                          className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50/80 transition-colors border border-transparent hover:border-slate-100"
                        >
                          <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">
                            {(u.name || u.email)[0].toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 truncate">{u.name}</p>
                            <p className="text-xs text-slate-500 truncate">{u.email}</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium shrink-0">
                            {u.role}
                          </span>
                          {u.directGrant !== false ? (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmAction({
                                  type: 'revoke',
                                  userId: u.id,
                                  name: u.name,
                                  email: u.email,
                                  role: u.role,
                                })
                              }
                              disabled={actionLoading !== null}
                              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 disabled:opacity-50 transition-colors"
                            >
                              {actionLoading === u.id ? 'Revoking...' : 'Revoke'}
                            </button>
                          ) : (
                            <span className="shrink-0 text-xs text-slate-400 font-medium">Via role / dept</span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {grantedData.totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                        <span className="text-xs text-slate-500 font-medium">{grantedData.total} total</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setGrantedPage((p) => Math.max(1, p - 1))}
                            disabled={grantedPage <= 1}
                            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                          >
                            <ChevronLeftIcon className="h-4 w-4" />
                          </button>
                          <span className="px-3 py-1 text-sm font-medium text-slate-600">
                            {grantedPage} / {grantedData.totalPages}
                          </span>
                          <button
                            type="button"
                            onClick={() => setGrantedPage((p) => Math.min(grantedData.totalPages, p + 1))}
                            disabled={grantedPage >= grantedData.totalPages}
                            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                          >
                            <ChevronRightIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-amber-50/50 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600">
                  <UserPlusIcon className="h-4 w-4" />
                </div>
                <h4 className="font-semibold text-slate-800">Eligible to grant</h4>
              </div>
              <div className="p-4 min-h-[200px]">
                {notGrantedLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500 mb-3" />
                    <p className="text-sm font-medium">Loading...</p>
                  </div>
                ) : notGrantedData && notGrantedData.items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <UserIcon className="h-10 w-10 text-slate-300 mb-2" />
                    <p className="text-sm font-medium">No eligible users or all granted</p>
                  </div>
                ) : notGrantedData ? (
                  <>
                    <ul className="space-y-2">
                      {notGrantedData.items.map((u) => (
                        <li
                          key={u.id}
                          className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50/80 transition-colors border border-transparent hover:border-slate-100"
                        >
                          <div className="h-10 w-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold shrink-0">
                            {(u.name || u.email)[0].toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 truncate">{u.name}</p>
                            <p className="text-xs text-slate-500 truncate">{u.email}</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium shrink-0">
                            {u.role}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAction({
                                type: 'grant',
                                userId: u.id,
                                name: u.name,
                                email: u.email,
                                role: u.role,
                              })
                            }
                            disabled={actionLoading !== null}
                            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === u.id ? 'Granting...' : 'Grant'}
                          </button>
                        </li>
                      ))}
                    </ul>
                    {notGrantedData.totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                        <span className="text-xs text-slate-500 font-medium">{notGrantedData.total} total</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setNotGrantedPage((p) => Math.max(1, p - 1))}
                            disabled={notGrantedPage <= 1}
                            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                          >
                            <ChevronLeftIcon className="h-4 w-4" />
                          </button>
                          <span className="px-3 py-1 text-sm font-medium text-slate-600">
                            {notGrantedPage} / {notGrantedData.totalPages}
                          </span>
                          <button
                            type="button"
                            onClick={() => setNotGrantedPage((p) => Math.min(notGrantedData.totalPages, p + 1))}
                            disabled={notGrantedPage >= notGrantedData.totalPages}
                            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                          >
                            <ChevronRightIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] max-w-md w-full p-8 border border-slate-200/50 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
              {confirmAction.type === 'grant' ? 'Grant group access?' : 'Revoke group access?'}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              {confirmAction.type === 'grant'
                ? `Grant access to group "${groupName}" for ${confirmAction.name} (${confirmAction.email})?`
                : `Revoke direct access to group "${groupName}" from ${confirmAction.name} (${confirmAction.email})?`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                disabled={actionLoading !== null}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!confirmAction) return;
                  if (confirmAction.type === 'grant') {
                    handleGrant(confirmAction.userId, confirmAction.role, confirmAction.name, confirmAction.email);
                  } else {
                    handleRevoke(confirmAction.userId, confirmAction.role, confirmAction.name, confirmAction.email);
                  }
                  setConfirmAction(null);
                }}
                disabled={actionLoading !== null}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200/50 disabled:opacity-50 transition-all"
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
