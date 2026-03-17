'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  CogIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import GroupAccessModal from '@/components/GroupAccessModal';

interface FieldDefinition {
  id?: string;
  name: string;
  type: 'TEXT' | 'PASSWORD' | 'URL' | 'EMAIL' | 'NUMBER' | 'TEXTAREA';
  required: boolean;
  encrypted: boolean;
  placeholder?: string;
  order: number;
  hasData?: boolean;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  departmentId: string;
  department: {
    id: string;
    name: string;
  };
  fieldDefinitions: FieldDefinition[];
  _count?: {
    items: number;
    userAccess: number;
  };
  createdAt: string;
}

interface GroupManagementProps {
  isSuperAdmin: boolean;
  userDepartmentId?: string;
}

export default function GroupManagement({ isSuperAdmin, userDepartmentId }: GroupManagementProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [subDepartmentFilter, setSubDepartmentFilter] = useState<string>('');
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [groupForAccess, setGroupForAccess] = useState<Group | null>(null);

  useEffect(() => {
    fetchGroups();
    if (isSuperAdmin) {
      fetchDepartments();
    }
  }, [isSuperAdmin]);

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/admin/departments');
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to load departments');
    }
  };

  const confirmDeleteGroup = async () => {
    if (!groupToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/groups/${groupToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Group deleted successfully');
        setGroupToDelete(null);
        fetchGroups();
      } else {
        const data = await response.json();
        const msg = data.error || 'Failed to delete group';
        setDeleteError(msg);
        toast.error(msg);
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      const msg = 'Failed to delete group';
      setDeleteError(msg);
      toast.error(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
    setShowCreateModal(true);
  };

  const handleManageItems = (group: Group) => {
    // Navigate to dedicated group items page
    window.location.href = `/admin/dashboard/groups/${group.id}/items`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-24 bg-slate-200 rounded"></div>
            <div className="h-24 bg-slate-200 rounded"></div>
            <div className="h-24 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const departmentOptions =
    departments.length > 0
      ? departments
      : Array.from(new Map(groups.map((g) => [g.department.id, g.department])).values());

  const subDepartmentOptions =
    departmentFilter && departments.length > 0
      ? departments.filter((d) => d.parentId === departmentFilter)
      : [];

  const departmentById: Record<string, any> = departments.reduce(
    (acc, d) => ({ ...acc, [d.id]: d }),
    {} as Record<string, any>
  );

  const filteredGroups = groups.filter((g) => {
    if (!departmentFilter) return true;

    const dept = departmentById[g.department.id];

    if (!subDepartmentFilter) {
      // Show groups in the selected department and all its sub-departments
      if (g.department.id === departmentFilter) return true;
      if (dept && dept.parentId === departmentFilter) return true;
      return false;
    }

    // When a sub-department is chosen, show only groups belonging to that sub-department
    return g.department.id === subDepartmentFilter;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Group Management</h2>
          <p className="text-slate-600 mt-1">
            Create and manage groups with custom fields for organizing data.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Department:</label>
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setSubDepartmentFilter('');
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All</option>
              {departmentOptions.map((dept: any) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          {departmentFilter && subDepartmentOptions.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Sub-department:</label>
              <select
                value={subDepartmentFilter}
                onChange={(e) => setSubDepartmentFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All under department</option>
                {subDepartmentOptions.map((dept: any) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-lg hover:opacity-90 transition-all shadow-sm"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Group
        </button>
        </div>
      </div>

      {filteredGroups.length === 0 ? (
        <div className="text-center py-12">
          <CogIcon className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-2 text-sm font-medium text-slate-900">No groups</h3>
          <p className="mt-1 text-sm text-slate-500">
            Get started by creating your first group with custom fields.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-lg hover:opacity-90 transition-all shadow-sm"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Group
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => {
            const dept = departmentById[group.department.id];
            const parentDept =
              dept && dept.parent
                ? dept.parent
                : dept && dept.parentId
                ? departmentById[dept.parentId]
                : null;
            const isSubDept = !!parentDept;

            return (
              <div key={group.id} className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <CogIcon className="h-8 w-8 text-purple-600" />
                    <div>
                      <h3 className="font-semibold text-slate-900">{group.name}</h3>
                      <p className="text-xs font-medium text-slate-500">
                        {isSubDept
                          ? `${parentDept.name} › ${dept.name}`
                          : dept?.name || group.department.name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedGroup(group)}
                      className="p-2 text-slate-400 hover:text-purple-600 transition-colors"
                      title="View details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleEditGroup(group)}
                      className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                      title="Edit group"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setGroupForAccess(group)}
                      className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                      title="Manage access"
                    >
                      <UserGroupIcon className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => setGroupToDelete(group)}
                      className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              
              {group.description && (
                <p className="text-sm text-slate-600 mb-4">{group.description}</p>
              )}
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Fields:</span>
                  <span className="font-medium">{group.fieldDefinitions.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Items:</span>
                  <span className="font-medium">{group._count?.items || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Users:</span>
                  <span className="font-medium">{group._count?.userAccess || 0}</span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleManageItems(group)}
                    className="flex-1 text-sm text-purple-600 hover:text-purple-800 font-medium"
                  >
                    Manage Items
                  </button>
                </div>
              </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <CreateGroupModal
          onClose={() => {
            setShowCreateModal(false);
            setEditingGroup(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingGroup(null);
            fetchGroups();
          }}
          departments={departments}
          isSuperAdmin={isSuperAdmin}
          userDepartmentId={userDepartmentId}
          editingGroup={editingGroup}
        />
      )}

      {selectedGroup && (
        <GroupDetailsModal
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
        />
      )}

      {groupForAccess && (
        <GroupAccessModal
          groupId={groupForAccess.id}
          groupName={groupForAccess.name}
          departmentPath={
            (() => {
              const dept = departmentById[groupForAccess.department.id];
              const parentDept =
                dept && dept.parent
                  ? dept.parent
                  : dept && dept.parentId
                  ? departmentById[dept.parentId]
                  : null;
              if (parentDept) {
                return `${parentDept.name} › ${dept.name}`;
              }
              return dept?.name || groupForAccess.department.name;
            })()
          }
          onClose={() => setGroupForAccess(null)}
        />
      )}

      {groupToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete group?</h3>
            <p className="text-sm text-slate-600 mb-3">
              This will delete the group <span className="font-semibold">{groupToDelete.name}</span>{' '}
              and all items and field data under it. This action cannot be undone.
            </p>
            {deleteError && (
              <p className="text-sm text-red-600 mb-3">{deleteError}</p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!deleteLoading) {
                    setGroupToDelete(null);
                    setDeleteError(null);
                  }
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteGroup}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CreateGroupModalProps {
  onClose: () => void;
  onSuccess: () => void;
  departments: any[];
  isSuperAdmin: boolean;
  userDepartmentId?: string;
  editingGroup?: Group | null;
}

function CreateGroupModal({ onClose, onSuccess, departments, isSuperAdmin, userDepartmentId, editingGroup }: CreateGroupModalProps) {
  const [formData, setFormData] = useState({
    name: editingGroup?.name || '',
    description: editingGroup?.description || '',
    departmentId: editingGroup?.departmentId || userDepartmentId || '',
    subDepartmentId: ''
  });
  
  // Get sub-departments for selected department
  const [subDepartments, setSubDepartments] = useState<any[]>([]);
  
  // Filter departments to get only top-level ones and sub-departments
  const topLevelDepartments = departments.filter(dept => !dept.parentId);
  const selectedDeptSubDepartments = departments.filter(dept => dept.parentId === formData.departmentId);
  const [fieldDefinitions, setFieldDefinitions] = useState<FieldDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fieldTypes = [
    { value: 'TEXT', label: 'Text' },
    { value: 'PASSWORD', label: 'Password' },
    { value: 'URL', label: 'URL' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'NUMBER', label: 'Number' },
    { value: 'TEXTAREA', label: 'Long Text' }
  ];

  // Initialize field definitions when editing
  useEffect(() => {
    if (editingGroup && editingGroup.fieldDefinitions) {
      setFieldDefinitions(editingGroup.fieldDefinitions.map(field => ({
        id: field.id,
        name: field.name,
        type: field.type,
        required: field.required,
        encrypted: field.encrypted,
        placeholder: field.placeholder || '',
        order: field.order,
        hasData: (field as any)._count?.values > 0
      })));
    } else {
      setFieldDefinitions([]);
    }
  }, [editingGroup]);

  const addField = () => {
    setFieldDefinitions([
      ...fieldDefinitions,
      {
        name: '',
        type: 'TEXT',
        required: false,
        encrypted: false,
        placeholder: '',
        order: fieldDefinitions.length
      }
    ]);
  };

  const updateField = (index: number, field: Partial<FieldDefinition>) => {
    const updated = [...fieldDefinitions];
    updated[index] = { ...updated[index], ...field };
    setFieldDefinitions(updated);
  };

  const removeField = (index: number) => {
    const field = fieldDefinitions[index];
    if (field?.hasData) {
      const confirmed = window.confirm(
        `Field "${field.name || 'unnamed'}" already has data in existing items. ` +
        'Removing it will permanently delete that data from all items. Do you want to continue?'
      );
      if (!confirmed) return;
    }
    setFieldDefinitions(fieldDefinitions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = editingGroup ? `/api/groups/${editingGroup.id}` : '/api/groups';
      const method = editingGroup ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          departmentId: formData.subDepartmentId || formData.departmentId, // Use sub-department if selected
          fieldDefinitions
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${editingGroup ? 'update' : 'create'} group`);
      }

      toast.success(editingGroup ? 'Group updated successfully' : 'Group created successfully');
      onSuccess();
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">
            {editingGroup ? 'Edit Group' : 'Create New Group'}
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            {editingGroup ? 'Update group details and field definitions.' : 'Create a group with custom fields to organize your data.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Group Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="e.g., AWS Credentials, API Keys"
              />
            </div>

            {/* Department / Sub-department selection only when creating a new group */}
            {!editingGroup && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Department *
                  </label>
                  <select
                    required
                    value={formData.departmentId}
                    onChange={(e) => {
                      setFormData({ 
                        ...formData, 
                        departmentId: e.target.value,
                        subDepartmentId: '' // Reset sub-department when department changes
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    disabled={!isSuperAdmin}
                  >
                    <option value="">Select Department</option>
                    {topLevelDepartments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                {/* Sub-Department Selection (only show if selected department has sub-departments) */}
                {formData.departmentId && selectedDeptSubDepartments.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Sub-Department (Optional)
                    </label>
                    <select
                      value={formData.subDepartmentId}
                      onChange={(e) => setFormData({ ...formData, subDepartmentId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">Create under main department</option>
                      {selectedDeptSubDepartments.map(subDept => (
                        <option key={subDept.id} value={subDept.id}>{subDept.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      Choose a sub-department or leave blank to create under the main department.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Brief description of what this group stores"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-slate-900">Field Definitions</h4>
              <button
                type="button"
                onClick={addField}
                className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Field
              </button>
            </div>

            <div className="space-y-4">
              {fieldDefinitions.map((field, index) => (
                <div key={index} className="border border-slate-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Field Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={field.name}
                        onChange={(e) => updateField(index, { name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="e.g., Username, API Key"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Type *
                      </label>
                      <select
                        value={field.type}
                        onChange={(e) => updateField(index, { type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        {fieldTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Placeholder
                      </label>
                      <input
                        type="text"
                        value={field.placeholder}
                        onChange={(e) => updateField(index, { placeholder: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Hint text"
                      />
                    </div>

                    <div className="flex items-end space-x-2">
                      <button
                        type="button"
                        onClick={() => removeField(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove field"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(index, { required: e.target.checked })}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="ml-2 text-sm text-slate-700">Required</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={field.encrypted}
                        onChange={(e) => updateField(index, { encrypted: e.target.checked })}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="ml-2 text-sm text-slate-700">Encrypt (for sensitive data)</span>
                    </label>
                  </div>
                </div>
              ))}

              {fieldDefinitions.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-slate-300 rounded-lg">
                  <DocumentTextIcon className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-sm text-slate-600">
                    No fields defined yet. Add fields to structure your group data.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? (editingGroup ? 'Updating...' : 'Creating...') : (editingGroup ? 'Update Group' : 'Create Group')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface GroupDetailsModalProps {
  group: Group;
  onClose: () => void;
}

function GroupDetailsModal({ group, onClose }: GroupDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{group.name}</h3>
              <p className="text-sm text-slate-600">{group.department.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              <span className="sr-only">Close</span>
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {group.description && (
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Description</h4>
              <p className="text-slate-600">{group.description}</p>
            </div>
          )}

          <div>
            <h4 className="font-medium text-slate-900 mb-3">Field Definitions ({group.fieldDefinitions.length})</h4>
            <div className="space-y-3">
              {group.fieldDefinitions.map((field, index) => (
                <div key={field.id || index} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-900">{field.name}</span>
                      <span className="ml-2 px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">
                        {field.type}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      {field.required && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">Required</span>
                      )}
                      {field.encrypted && (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded">Encrypted</span>
                      )}
                    </div>
                  </div>
                  {field.placeholder && (
                    <p className="text-sm text-slate-500 mt-1">Placeholder: {field.placeholder}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-slate-900">{group._count?.items || 0}</div>
              <div className="text-sm text-slate-600">Items</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-slate-900">{group._count?.userAccess || 0}</div>
              <div className="text-sm text-slate-600">Users</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-slate-900">{group.fieldDefinitions.length}</div>
              <div className="text-sm text-slate-600">Fields</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
