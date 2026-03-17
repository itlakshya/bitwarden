'use client';

import { useEffect, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
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

  // Initial load and when page or search changes
  useEffect(() => {
    fetchGranted(grantedPage);
    fetchNotGranted(notGrantedPage);
  }, [grantedPage, notGrantedPage, search]);

  const handleGrant = async (userId: string) => {
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
      loadBoth();
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
      const res = await fetch(`/api/groups/${groupId}/access`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Revoke failed');
      toast.success('Access revoked from group');
      loadBoth();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl md:w-11/12 max-h-[90vh] flex flex-col my-8">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Manage group access</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {groupName}
              {departmentPath ? ` · ${departmentPath}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <XMarkIcon className="h-4 w-4" />
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
            {/* Granted */}
            <section className="md:w-1/2 md:min-w-0">
              <h4 className="font-medium text-slate-900 mb-2">Granted users</h4>
              {grantedLoading ? (
                <p className="text-slate-500 text-sm">Loading...</p>
              ) : grantedData && grantedData.items.length === 0 ? (
                <p className="text-slate-500 text-sm">No explicit group access yet.</p>
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
                              {u.directGrant !== false ? (
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
                                <span className="text-xs text-slate-400">
                                  Via role / department
                                </span>
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

            {/* Not granted */}
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
              {confirmAction.type === 'grant' ? 'Grant group access?' : 'Revoke group access?'}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              {confirmAction.type === 'grant'
                ? `Grant access to group "${groupName}" for ${confirmAction.name} (${confirmAction.email})?`
                : `Revoke direct access to group "${groupName}" from ${confirmAction.name} (${confirmAction.email})?`}
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

