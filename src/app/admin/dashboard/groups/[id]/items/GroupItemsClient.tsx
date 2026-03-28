'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  ArrowLeftIcon,
  EyeIcon,
  EyeSlashIcon,
  DocumentDuplicateIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import GroupAccessModal from '@/components/GroupAccessModal';

interface FieldDefinition {
  id: string;
  name: string;
  type: 'TEXT' | 'PASSWORD' | 'URL' | 'EMAIL' | 'NUMBER' | 'TEXTAREA';
  required: boolean;
  encrypted: boolean;
  placeholder?: string | null;
  order: number;
}

interface Group {
  id: string;
  name: string;
  description?: string | null;
  department: {
    id: string;
    name: string;
  };
  fieldDefinitions: FieldDefinition[];
}

interface GroupItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  createdAt: string;
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
}

interface GroupItemsClientProps {
  group: Group;
  isSuperAdmin: boolean;
}

export default function GroupItemsClient({ group, isSuperAdmin }: GroupItemsClientProps) {
  const router = useRouter();
  const [items, setItems] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [fieldValues, setFieldValues] = useState<any>({});
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, number>>({});
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [editingItem, setEditingItem] = useState<GroupItem | null>(null);
  const [editFieldValues, setEditFieldValues] = useState<Record<string, string>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<GroupItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchItems();
    initializeFieldValues();
  }, []);

  const initializeFieldValues = () => {
    const initialValues: any = {};
    group.fieldDefinitions.forEach(field => {
      initialValues[field.id] = '';
    });
    setFieldValues(initialValues);
  };

  const fetchItems = async () => {
    try {
      const response = await fetch(`/api/groups/${group.id}/items`);
      if (response.ok) {
        const data = await response.json();
        setItems(data.items);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setError('');

    try {
      // Generate title from first field value or use group name
      const firstFieldValue = Object.values(fieldValues).find(value => value && typeof value === 'string' && value.trim()) as string;
      const generatedTitle = firstFieldValue || `${group.name} Item`;

      const response = await fetch(`/api/groups/${group.id}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: generatedTitle,
          description: '',
          status: 'ACTIVE',
          fieldValues: fieldValues
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create item');
      }

      toast.success('Item created successfully');
      initializeFieldValues();
      setShowAddModal(false);
      fetchItems();
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setCreateLoading(false);
    }
  };



  const getFieldValue = (item: GroupItem, fieldId: string) => {
    const fieldValue = item.values.find(v => v.fieldDefinition.id === fieldId);
    return fieldValue?.value || '';
  };

  const buildFieldValuesFromItem = (item: GroupItem): Record<string, string> => {
    const values: Record<string, string> = {};
    group.fieldDefinitions.forEach((field) => {
      values[field.id] = getFieldValue(item, field.id);
    });
    return values;
  };

  const openEditModal = (item: GroupItem) => {
    setEditingItem(item);
    setEditFieldValues(buildFieldValuesFromItem(item));
    setError('');
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    if (!editingItem) return;
    e.preventDefault();
    setEditLoading(true);
    setError('');
    try {
      const firstFieldValue = Object.values(editFieldValues).find(value => value && typeof value === 'string' && value.trim()) as string;
      const title = firstFieldValue || `${group.name} Item`;
      const values = group.fieldDefinitions.map((fd) => ({
        fieldDefinitionId: fd.id,
        value: editFieldValues[fd.id] ?? '',
      }));
      const response = await fetch(`/api/groups/${group.id}/items/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, values }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update item');
      }
      toast.success('Item updated successfully');
      setEditingItem(null);
      fetchItems();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update item';
      setError(msg);
      toast.error(msg);
    } finally {
      setEditLoading(false);
    }
  };

  const confirmDeleteItem = async () => {
    if (!deleteConfirmItem) return;
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/groups/${group.id}/items/${deleteConfirmItem.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast.success('Item deleted successfully');
        setDeleteConfirmItem(null);
        fetchItems();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete item');
      }
    } catch {
      toast.error('Failed to delete item');
    } finally {
      setDeleteLoading(false);
    }
  };

  const renderFieldValue = (item: GroupItem, field: FieldDefinition) => {
    const fieldVal = item.values.find(v => v.fieldDefinition.id === field.id) || { value: '', encryptedValue: '' };
    const value = fieldVal.value || '';
    const key = `${item.id}-${field.id}`;
    // const isPasswordVisible = visiblePasswords.has(key);

    const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    };

    const toggleReveal = () => {
      setVisiblePasswords(prev => {
        const currentState = prev[key] ?? 0;
        let nextState;
        
        if (field.type === 'PASSWORD') {
          // Password: 0 (dots) -> 1 (Encrypted) -> 2 (Decrypted) -> 0 (dots)
          nextState = (currentState + 1) % 3;
        } else {
          // Other Encrypted: 1 (Encrypted) -> 2 (Decrypted) -> 1 (Encrypted)
          nextState = currentState === 1 ? 2 : 1;
        }
        
        return {
          ...prev,
          [key]: nextState
        };
      });
    };

    const truncateContent = (text: string) => {
      if (!text) return '';
      return text.length > 16 ? `${text.slice(0, 16)}...` : text;
    };

    const renderCoreValue = () => {
      const key = `${item.id}-${field.id}`;
      // For non-password encrypted fields, default to state 1 (Encrypted)
      const currentState = visiblePasswords[key] ?? (field.type === 'PASSWORD' ? 0 : 1);
      
      const displayEncrypted = (fieldVal as any).encryptedValue || 'Encrypted';

      if (!value && currentState === 2) return <span className="text-slate-400">-</span>;

      if (field.type === 'PASSWORD') {
        return (
          <span 
            className="font-mono text-sm tracking-[0.25em] bg-slate-50 px-2 py-0.5 rounded border border-slate-100 inline-block text-slate-700 min-w-[80px]"
            title={currentState === 2 ? value : currentState === 1 ? displayEncrypted : undefined}
          >
            {currentState === 0 ? '•'.repeat(Math.min(value.length, 8)) : 
             currentState === 1 ? <span className="text-[10px] font-bold uppercase italic tracking-wider opacity-60 leading-tight">{truncateContent(displayEncrypted)}</span> : 
             truncateContent(value)}
          </span>
        );
      }

      if (field.encrypted) {
        return (
          <span 
            className={`font-mono ${currentState === 2 ? 'text-sm' : 'text-[10px] font-bold uppercase italic tracking-wider opacity-60'} bg-slate-50 px-2 py-0.5 rounded border border-slate-100 inline-block text-slate-700 min-w-[80px]`}
            title={currentState === 2 ? value : displayEncrypted}
          >
            {currentState === 2 ? truncateContent(value) : truncateContent(displayEncrypted)}
          </span>
        );
      }

      if (field.type === 'URL') {
        return (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline transition-colors font-medium"
            title={value}
          >
            {truncateContent(value)}
          </a>
        );
      }

      if (field.type === 'EMAIL') {
        return (
          <a 
            href={`mailto:${value}`}
            className="text-blue-600 hover:text-blue-800 hover:underline transition-colors font-medium"
            title={value}
          >
            {truncateContent(value)}
          </a>
        );
      }

      return (
        <span className="text-slate-900 font-medium" title={value}>
          {truncateContent(value)}
        </span>
      );
    };

    return (
      <div className="group/field relative flex items-center gap-2 w-fit min-w-max whitespace-nowrap">
        {renderCoreValue()}
        {value && (
          <div className="flex items-center gap-1 opacity-0 group-hover/field:opacity-100 transition-opacity">
            {(field.type === 'PASSWORD' || field.encrypted) && (
              <button
                onClick={toggleReveal}
                className="p-1 text-blue-400 hover:text-blue-600 hover:bg-white rounded transition-all shadow-sm border border-transparent hover:border-blue-100"
                title={(() => {
                  const key = `${item.id}-${field.id}`;
                  const currentState = visiblePasswords[key] ?? (field.type === 'PASSWORD' ? 0 : 1);
                  if (field.type === 'PASSWORD') {
                    if (currentState === 0) return 'Show encrypted status';
                    if (currentState === 1) return 'Decrypt';
                    return 'Hide';
                  }
                  return currentState === 1 ? 'Decrypt' : 'Hide';
                })()}
              >
                {(() => {
                  const key = `${item.id}-${field.id}`;
                  const currentState = visiblePasswords[key] ?? (field.type === 'PASSWORD' ? 0 : 1);
                  
                  if (field.type === 'PASSWORD') {
                    if (currentState === 0) return <EyeIcon className="h-3.5 w-3.5" />;
                    if (currentState === 1) return <LockClosedIcon className="h-3.5 w-3.5" />;
                    return <EyeSlashIcon className="h-3.5 w-3.5" />;
                  }
                  
                  return currentState === 1 ? <LockClosedIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-3.5 w-3.5" />;
                })()}
              </button>
            )}
            {(() => {
              const isEncryptedField = field.encrypted || field.type === 'PASSWORD';
              const key = `${item.id}-${field.id}`;
              const currentState = visiblePasswords[key] ?? (field.type === 'PASSWORD' ? 0 : 1);
              if (isEncryptedField && currentState !== 2) return null;
              
              return (
                <button
                  onClick={() => copyToClipboard(value)}
                  className="p-1 text-blue-400 hover:text-blue-600 hover:bg-white rounded transition-all shadow-sm border border-transparent hover:border-blue-100"
                  title="Copy"
                >
                  <DocumentDuplicateIcon className="h-3.5 w-3.5" />
                </button>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  const handleExportCsv = async () => {
    try {
      const res = await fetch(`/api/groups/${group.id}/items/export`, {
        method: 'GET',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to export CSV');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${group.name || 'group'}-items.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error exporting CSV:', error);
      toast.error(error.message || 'Failed to export CSV');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{group.name} - Items</h1>
                <p className="text-slate-600">{group.department.name}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleExportCsv}
                className="inline-flex items-center px-3 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
              >
                Export CSV
              </button>
              <button
                onClick={() => setShowAccessModal(true)}
                className="inline-flex items-center px-3 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
              >
                Manage access
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-lg hover:opacity-90 transition-all shadow-sm"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Item
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-slate-600 mt-4">Loading items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <PlusIcon className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No items yet</h3>
            <p className="text-slate-600 mb-6">Get started by adding your first item to this group.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-lg hover:opacity-90 transition-all"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add First Item
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    {group.fieldDefinitions.map((field) => (
                      <th
                        key={field.id}
                        className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]"
                      >
                        {field.name}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </th>
                    ))}
                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] w-32 border-l border-slate-100/30">
                      Created
                    </th>
                    <th className="px-10 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] w-40 text-right border-l border-slate-100/30">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((item) => (
                    <tr key={item.id} className="group/row hover:bg-blue-50/40 transition-colors">
                      {group.fieldDefinitions.map((field) => (
                        <td key={field.id} className="px-10 py-5 whitespace-nowrap">
                          {renderFieldValue(item, field)}
                        </td>
                      ))}
                      <td className="px-10 py-5 whitespace-nowrap text-[11px] font-medium text-slate-400 border-l border-slate-100/30">
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-10 py-5 whitespace-nowrap text-right border-l border-slate-100/30">
                        <div className="flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-blue-100 active:scale-90"
                            title="Edit item"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmItem(item)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-red-100 active:scale-90"
                            title="Delete item"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showAccessModal && (
        <GroupAccessModal
          groupId={group.id}
          groupName={group.name}
          departmentPath={group.department.name}
          onClose={() => setShowAccessModal(false)}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900">Delete item?</h3>
            <p className="text-slate-600 mt-2">
              Are you sure you want to delete this item? This action cannot be undone.
            </p>
            {deleteConfirmItem.title && (
              <p className="text-sm text-slate-500 mt-1 font-medium">&quot;{deleteConfirmItem.title}&quot;</p>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => !deleteLoading && setDeleteConfirmItem(null)}
                disabled={deleteLoading}
                className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteItem}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Edit Item</h3>
              <p className="text-sm text-slate-600 mt-1">
                Update item in {group.name}
              </p>
            </div>

            <form onSubmit={handleUpdateItem} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {group.fieldDefinitions.map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {field.name} {field.required && '*'}
                  </label>
                  {field.type === 'TEXTAREA' ? (
                    <textarea
                      required={field.required}
                      value={editFieldValues[field.id] ?? ''}
                      onChange={(e) => setEditFieldValues({
                        ...editFieldValues,
                        [field.id]: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder={field.placeholder || `Enter ${field.name.toLowerCase()}`}
                      rows={3}
                    />
                  ) : (
                    <input
                      type={field.type === 'PASSWORD' ? 'password' : 
                           field.type === 'EMAIL' ? 'email' :
                           field.type === 'URL' ? 'url' :
                           field.type === 'NUMBER' ? 'number' : 'text'}
                      required={field.required}
                      value={editFieldValues[field.id] ?? ''}
                      onChange={(e) => setEditFieldValues({
                        ...editFieldValues,
                        [field.id]: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder={field.placeholder || `Enter ${field.name.toLowerCase()}`}
                    />
                  )}
                </div>
              ))}

              <div className="flex justify-end space-x-4 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setError('');
                  }}
                  className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {editLoading ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Add New Item</h3>
              <p className="text-sm text-slate-600 mt-1">
                Add a new item to {group.name}
              </p>
            </div>

            <form onSubmit={handleCreateItem} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {group.fieldDefinitions.map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {field.name} {field.required && '*'}
                  </label>
                  {field.type === 'TEXTAREA' ? (
                    <textarea
                      required={field.required}
                      value={fieldValues[field.id] || ''}
                      onChange={(e) => setFieldValues({
                        ...fieldValues,
                        [field.id]: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder={field.placeholder || `Enter ${field.name.toLowerCase()}`}
                      rows={3}
                    />
                  ) : (
                    <input
                      type={field.type === 'PASSWORD' ? 'password' : 
                           field.type === 'EMAIL' ? 'email' :
                           field.type === 'URL' ? 'url' :
                           field.type === 'NUMBER' ? 'number' : 'text'}
                      required={field.required}
                      value={fieldValues[field.id] || ''}
                      onChange={(e) => setFieldValues({
                        ...fieldValues,
                        [field.id]: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder={field.placeholder || `Enter ${field.name.toLowerCase()}`}
                    />
                  )}
                </div>
              ))}

              <div className="flex justify-end space-x-4 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setError('');
                    initializeFieldValues();
                  }}
                  className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {createLoading ? 'Creating...' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}