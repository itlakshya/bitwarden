'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { 
  BuildingOfficeIcon, 
  CogIcon, 
  PlusIcon, 
  EyeSlashIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ArrowLeftOnRectangleIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { signOut } from 'next-auth/react';
import { APP_NAME_PARTS } from '@/lib/branding';
import GroupItemModal from './components/GroupItemModal';

interface Group {
  id: string;
  name: string;
  description?: string;
  department: {
    id: string;
    name: string;
    parent?: {
      id: string;
      name: string;
    } | null;
  };
  fieldDefinitions: Array<{
    id: string;
    name: string;
    type: string;
    required: boolean;
    encrypted: boolean;
  }>;
  _count?: {
    items: number;
    userAccess: number;
  };
  canManage?: boolean;
}

interface GroupItem {
  id: string;
  title: string;
  status: string;
  targetDate?: string;
  values: Array<{
    id: string;
    value: string;
    fieldDefinition: {
      id: string;
      name: string;
      type: string;
      encrypted: boolean;
    };
  }>;
  createdAt: string;
}

export default function NewDashboardClient() {
  const { data: session } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupItems, setGroupItems] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [addItemLoading, setAddItemLoading] = useState(false);
  const [groupSearch, setGroupSearch] = useState('');
  const [editingItem, setEditingItem] = useState<GroupItem | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (session?.user) {
      fetchUserGroups();
    }
  }, [session]);

  const fetchUserGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/groups');
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      } else {
        // If endpoint doesn't exist yet, show empty state
        setGroups([]);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupItems = async (groupId: string) => {
    try {
      setItemsLoading(true);
      const response = await fetch(`/api/groups/${groupId}/items`);
      if (response.ok) {
        const data = await response.json();
        setGroupItems(data.items || []);
      } else {
        setGroupItems([]);
      }
    } catch (error) {
      console.error('Error fetching group items:', error);
      setGroupItems([]);
    } finally {
      setItemsLoading(false);
    }
  };

  const handleGroupSelect = (group: Group) => {
    setSelectedGroup(group);
    fetchGroupItems(group.id);
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  const handleAddItem = async (itemData: any) => {
    if (!selectedGroup) return;
    if (selectedGroup.canManage === false) {
      toast.error('You have view-only access to this group.');
      return;
    }
    
    try {
      setAddItemLoading(true);
      const response = await fetch(`/api/groups/${selectedGroup.id}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
      });

      if (response.ok) {
        const data = await response.json();
        setGroupItems([data.item, ...groupItems]);
        setShowAddItemModal(false);
        toast.success('Item added successfully');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to add item');
      }
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    } finally {
      setAddItemLoading(false);
    }
  };

  const handleUpdateItem = async (itemId: string, itemData: any) => {
    if (!selectedGroup) return;
    if (selectedGroup.canManage === false) {
      toast.error('You have view-only access to this group.');
      return;
    }

    try {
      setAddItemLoading(true);
      const response = await fetch(
        `/api/groups/${selectedGroup.id}/items/${itemId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(itemData),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update item');
      }

      toast.success('Item updated successfully');
      // Optimistically update local state; re-fetch items for full accuracy
      fetchGroupItems(selectedGroup.id);
      setShowAddItemModal(false);
      setEditingItem(null);
    } catch (error: any) {
      console.error('Error updating item:', error);
      toast.error(error.message || 'Failed to update item');
    } finally {
      setAddItemLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!selectedGroup) return;
    if (selectedGroup.canManage === false) {
      toast.error('You have view-only access to this group.');
      return;
    }

    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/groups/${selectedGroup.id}/items/${itemId}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete item');
      }

      toast.success('Item deleted successfully');
      setGroupItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (error: any) {
      console.error('Error deleting item:', error);
      toast.error(error.message || 'Failed to delete item');
    }
  };

  const renderFieldValue = (value: any, itemId: string) => {
    const { fieldDefinition } = value;
    const isRevealed = revealedPasswords[`${itemId}-${fieldDefinition.id}`];

    const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    };

    const toggleReveal = () => {
      setRevealedPasswords(prev => ({
        ...prev,
        [`${itemId}-${fieldDefinition.id}`]: !isRevealed
      }));
    };

    const truncateContent = (text: string) => {
      if (!text) return '';
      return text.length > 16 ? `${text.slice(0, 16)}...` : text;
    };

    const renderCoreValue = () => {
      if (fieldDefinition.type === 'URL') {
        return (
          <a 
            href={value.value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline transition-colors break-all font-semibold"
            title={value.value}
          >
            {truncateContent(value.value)}
          </a>
        );
      }
      
      if (fieldDefinition.encrypted || fieldDefinition.type === 'PASSWORD') {
        return (
          <span className="font-mono text-base tracking-[0.25em] bg-slate-100/80 px-3 py-1 rounded-lg border border-slate-200/60 inline-block text-slate-700 min-w-[120px]" title={isRevealed ? value.value : undefined}>
            {isRevealed ? truncateContent(value.value) : '•'.repeat(Math.min(value.value.length, 12))}
          </span>
        );
      }
      
      return (
        <span className="break-words text-slate-800 font-medium" title={value.value}>
          {truncateContent(value.value)}
        </span>
      );
    };

    return (
      <div className="group/field relative flex items-center gap-3 w-fit">
        {renderCoreValue()}
        <div className="flex items-center gap-1 opacity-0 group-hover/field:opacity-100 transition-opacity">
          {(fieldDefinition.encrypted || fieldDefinition.type === 'PASSWORD') && (
            <button
              onClick={toggleReveal}
              className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-white rounded-md transition-all shadow-sm border border-transparent hover:border-blue-100"
              title={isRevealed ? 'Hide' : 'Show'}
            >
              {isRevealed ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          )}
          <button
            onClick={() => copyToClipboard(value.value)}
            className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-white rounded-md transition-all shadow-sm border border-transparent hover:border-blue-100"
            title="Copy"
          >
            <DocumentDuplicateIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-center">
            <div className="w-12 h-12 bg-slate-200 rounded-full mx-auto mb-4"></div>
            <div className="h-4 bg-slate-200 rounded w-32 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  const normalizedSearch = groupSearch.trim().toLowerCase();
  const filteredGroups =
    !normalizedSearch
      ? groups
      : groups.filter((group) => {
          const name = group.name.toLowerCase();
          const dept = group.department.name.toLowerCase();
          const parent = group.department.parent?.name?.toLowerCase() || '';
          return (
            name.includes(normalizedSearch) ||
            dept.includes(normalizedSearch) ||
            parent.includes(normalizedSearch)
          );
        });

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100/80">
          <div className="flex items-center justify-start h-14 overflow-hidden">
            <img src="/logo.png" alt="Logo" className="h-full w-auto object-contain" />
          </div>
        </div>

        {/* Groups List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-bold text-blue-900 uppercase tracking-[0.2em] flex items-center gap-2">
                <BuildingOfficeIcon className="h-3.5 w-3.5" />
                My Groups
              </h2>
              {groups.length > 0 && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100 shadow-sm uppercase tracking-wider">
                  {filteredGroups.length} available
                </span>
              )}
            </div>
            {groups.length > 0 && (
              <div className="relative group/search">
                <input
                  type="text"
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  placeholder="Search your groups..."
                  className="w-full rounded-xl border border-slate-200 bg-white pl-4 pr-10 py-3 text-[11px] font-semibold text-blue-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all shadow-sm"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-200 group-focus-within/search:text-blue-400 transition-colors">
                  <UserGroupIcon className="h-4 w-4" />
                </div>
              </div>
            )}
          </div>

          {groups.length === 0 ? (
            <div className="text-center py-8">
              <CogIcon className="mx-auto h-8 w-8 text-slate-400 mb-3" />
              <h3 className="text-sm font-medium text-slate-900 mb-1">No Groups Available</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Contact your department administrator to get access to groups and start managing data.
              </p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-8">
              <CogIcon className="mx-auto h-8 w-8 text-slate-400 mb-3" />
              <h3 className="text-sm font-medium text-slate-900 mb-1">No matching groups</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Try adjusting your search to find a different group.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => handleGroupSelect(group)}
                  className={`group/btn w-full text-left px-4 py-2.5 rounded-lg transition-all duration-200 border-l-2 mb-1 relative ${
                    selectedGroup?.id === group.id
                      ? 'bg-blue-50 border-blue-600'
                      : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-1.5 rounded-md transition-colors ${
                      selectedGroup?.id === group.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100/50 text-slate-400 group-hover/btn:bg-slate-100 group-hover/btn:text-slate-500'
                    }`}>
                      <BuildingOfficeIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-semibold truncate tracking-tight ${
                        selectedGroup?.id === group.id ? 'text-blue-900' : 'text-slate-700'
                      }`}>
                        {group.name}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 truncate uppercase tracking-widest leading-none mt-0.5">
                        {group.department.parent ? `${group.department.parent.name} • ${group.department.name}` : group.department.name}
                      </p>
                    </div>
                    {group.canManage === false && (
                      <EyeIcon className={`h-3.5 w-3.5 ${selectedGroup?.id === group.id ? 'text-blue-400' : 'text-slate-300'}`} />
                    )}
                  </div>
                  
                  {selectedGroup?.id === group.id && group._count && (
                    <div className="flex items-center gap-3 mt-2 ml-9 text-[9px] font-bold uppercase tracking-widest text-blue-500/80 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center gap-1.5">
                        <DocumentTextIcon className="h-3 w-3" />
                        {group._count.items}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <UserGroupIcon className="h-3 w-3" />
                        {group._count.userAccess}
                      </div>
                    </div>
                  )}
                </button>
              ))}

            </div>
          )}
        </div>

        {/* Footer Profile & Sign Out */}
        <div className="mt-auto border-t border-slate-100 bg-white">
          {session?.user && (
            <div className="p-6">
              <div className="mb-4">
                <p className="text-[14px] font-bold text-blue-900 truncate tracking-tight">
                  {session.user.name}
                </p>
                <p className="text-[10px] font-semibold text-blue-400 truncate uppercase mt-0.5 tracking-wider">
                  {session.user.email}
                </p>
              </div>
              
              <button
                onClick={handleSignOut}
                className="group/logout w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-blue-50 text-slate-500 hover:bg-blue-100/40 hover:border-blue-200 hover:text-blue-600 rounded-xl transition-all duration-300 active:scale-[0.98] text-[10px] font-black uppercase tracking-[0.2em]"
              >
                Sign out
                <ArrowLeftOnRectangleIcon className="h-4 w-4 group-hover/logout:-translate-x-1 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedGroup ? (
          <>
            <div className="px-10 md:px-14 py-6 flex flex-col md:flex-row justify-between items-center relative z-10 border-b border-slate-100 bg-white">
              <div className="mb-4 md:mb-0 w-full md:w-auto text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-4 mb-3">
                  <div className="flex items-center gap-2 bg-gradient-to-br from-yellow-400 to-amber-500 text-white p-1.5 rounded-lg shadow-sm">
                    <ShieldCheckIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1 rounded-lg border border-blue-100">
                    <BuildingOfficeIcon className="h-3.5 w-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      {selectedGroup?.department.parent ? `${selectedGroup.department.parent.name} • ${selectedGroup.department.name}` : selectedGroup?.department.name}
                    </span>
                  </div>
                </div>
                <h2 className="text-4xl font-black text-blue-900 tracking-tight uppercase leading-none">
                  {selectedGroup?.name}
                </h2>
              </div>
              {selectedGroup?.canManage !== false && (
                <button 
                  onClick={() => {
                    setEditingItem(null);
                    setShowAddItemModal(true);
                  }}
                  className="w-full md:w-auto inline-flex items-center justify-center px-10 py-4 bg-blue-600 hover:bg-amber-500 text-white font-bold rounded-2xl transition-all duration-300 shadow-xl shadow-blue-500/10 hover:shadow-amber-500/20 active:scale-95 group uppercase tracking-[0.25em] text-[10px] ring-4 ring-blue-50"
                >
                  <PlusIcon className="h-4 w-4 mr-3 group-hover:rotate-90 transition-transform duration-300" />
                  Add New Item
                </button>
              )}
            </div>

            {/* Group Items Grid */}
            <div className="flex-1 overflow-y-auto px-6 md:px-10 pt-10 pb-10">              {itemsLoading ? (
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                    <div className="h-4 bg-slate-100 rounded-full w-32 animate-pulse"></div>
                    <div className="h-4 bg-slate-100 rounded-full w-48 animate-pulse"></div>
                  </div>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="p-6 border-b border-slate-50 last:border-0 flex items-center gap-8 animate-pulse">
                      <div className="h-6 bg-slate-50 rounded-lg w-12"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-100 rounded w-full max-w-[200px]"></div>
                      </div>
                      <div className="h-4 bg-slate-50 rounded w-24"></div>
                    </div>
                  ))}
                </div>
              ) : groupItems.length === 0 ? (
                <div className="text-center py-20 px-8 bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
                  <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl mx-auto flex items-center justify-center mb-6">
                    <DocumentTextIcon className="h-10 w-10" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">No Items Available</h3>
                  <p className="text-slate-500 max-w-sm mx-auto mb-8 text-sm">
                    {selectedGroup?.canManage === false
                      ? 'You have view-only access, but no secure items have been found in this repository yet.'
                      : "Start populating your secure workspace by adding your first credential or item below."}
                  </p>
                  {selectedGroup?.canManage !== false && (
                    <button 
                      onClick={() => {
                        setEditingItem(null);
                        setShowAddItemModal(true);
                      }}
                      className="inline-flex items-center px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-50 uppercase tracking-widest text-[10px]"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add First Item
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_20px_50px_rgba(37,99,235,0.04)] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100">
                          {selectedGroup?.fieldDefinitions.map((fd) => (
                            <th key={fd.id} className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                              {fd.name}
                            </th>
                          ))}
                          <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] w-32 text-center border-l border-slate-100/50">Status</th>
                          {selectedGroup?.canManage !== false && (
                            <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] w-48 text-right border-l border-slate-100/50">
                              Actions
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {groupItems.map((item) => (
                          <tr key={item.id} className="group border-b border-slate-50 last:border-0 hover:bg-blue-50/60 transition-colors">
                            {selectedGroup?.fieldDefinitions.map((fd) => {
                              const value = item.values.find(v => v.fieldDefinition.id === fd.id);
                              return (
                                <td key={fd.id} className="px-10 py-5">
                                  {value && renderFieldValue(value, item.id)}
                                </td>
                              );
                            })}
                            <td className="px-10 py-5 text-center">
                              <span
                                className={`inline-flex px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border shadow-sm ${
                                  item.status === 'ACTIVE'
                                    ? 'bg-amber-50 text-amber-600 border-amber-100 shadow-amber-50'
                                    : item.status === 'ARCHIVED'
                                    ? 'bg-slate-50 text-slate-500 border-slate-200 shadow-slate-50'
                                    : 'bg-red-50 text-red-600 border-red-100 shadow-red-50'
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            {selectedGroup?.canManage !== false && (
                              <td className="px-10 py-5 text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    className="p-2 text-blue-500 bg-blue-50/50 hover:bg-blue-600 hover:text-white rounded-xl transition-all duration-300 shadow-sm border border-blue-100/50 active:scale-90"
                                    onClick={() => {
                                      setEditingItem(item);
                                      setShowAddItemModal(true);
                                    }}
                                    title="Edit Item"
                                  >
                                    <PencilIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    className="p-2 text-red-500 bg-red-50/50 hover:bg-red-600 hover:text-white rounded-xl transition-all duration-300 shadow-sm border border-red-100/50 active:scale-90"
                                    onClick={() => handleDeleteItem(item.id)}
                                    title="Delete Item"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center rounded-full bg-slate-100">
                <CogIcon className="w-10 h-10 text-slate-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">
                Select a Group
              </h2>
              <p className="text-slate-600">
                {groups.length > 0
                  ? "Choose a group from the sidebar to view and manage its data."
                  : "No groups available. Contact your department administrator for access."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {selectedGroup && (
        <GroupItemModal
          isOpen={showAddItemModal}
          onClose={() => {
            setShowAddItemModal(false);
            setEditingItem(null);
          }}
          onSubmit={(data) =>
            editingItem
              ? handleUpdateItem(editingItem.id, data)
              : handleAddItem(data)
          }
          group={selectedGroup}
          loading={addItemLoading}
          initialValues={
            editingItem
              ? editingItem.values.reduce(
                  (acc: Record<string, string>, v) => ({
                    ...acc,
                    [v.fieldDefinition.id]: v.value,
                  }),
                  {} as Record<string, string>
                )
              : undefined
          }
          mode={editingItem ? 'edit' : 'add'}
        />
      )}
    </div>
  );
}