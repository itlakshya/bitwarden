'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  BuildingOfficeIcon,
  PlusIcon,
  UserIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  EyeSlashIcon,
  EnvelopeIcon,
  KeyIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import Pagination from '@/components/Pagination';

interface Department {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  admin: {
    id: string;
    name: string;
    email: string;
  };
  children?: Department[];
  groups: Array<{
    id: string;
    name: string;
    _count: {
      items: number;
      userAccess: number;
    };
  }>;
  users: Array<{
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  }>;
  _count?: {
    groups: number;
    users: number;
  };
}

interface DepartmentManagementProps {
  isSuperAdmin: boolean;
  managedDepartment?: {
    id: string;
    name: string;
    parentId: string | null;
  } | null;
}

export default function DepartmentManagement({ isSuperAdmin, managedDepartment }: DepartmentManagementProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [parentDepartmentForSub, setParentDepartmentForSub] = useState<string | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchDepartments();
  }, [currentPage, pageSize, searchTerm, sortBy, sortOrder]);

  const fetchDepartments = async () => {
    try {
      if (!isSuperAdmin && managedDepartment) {
        // For department admins, show only their managed department
        const response = await fetch(`/api/admin/departments/${managedDepartment.id}`);
        if (response.ok) {
          const data = await response.json();
          setDepartments([data.department]);
          setTotalCount(1);
          setTotalPages(1);
        }
      } else {
        // For super admins, show only top-level departments with pagination
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: pageSize.toString(),
          search: searchTerm,
          sortBy,
          sortOrder,
          topLevelOnly: 'true'
        });

        const response = await fetch(`/api/admin/departments?${params}`);
        if (response.ok) {
          const data = await response.json();
          setDepartments(data.departments);
          setTotalCount(data.pagination.totalCount);
          setTotalPages(data.pagination.totalPages);
        }
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Department Management</h2>
          <p className="text-slate-600 mt-1">
            Create and manage departments with their administrators and sub-departments.
          </p>
        </div>
        
        {isSuperAdmin && (
          <button
            onClick={() => {
              setParentDepartmentForSub(null);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:opacity-90 transition-all shadow-sm"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Department
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="px-6 pb-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search departments, admins..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="createdAt">Created Date</option>
              <option value="name">Department Name</option>
              <option value="adminName">Admin Name</option>
              <option value="adminEmail">Admin Email</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 focus:ring-2 focus:ring-blue-500"
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {departments.length === 0 ? (
        <div className="text-center py-12">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-2 text-sm font-medium text-slate-900">
            {searchTerm ? 'No departments found' : 'No departments'}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {searchTerm 
              ? 'Try adjusting your search criteria.'
              : 'Get started by creating your first department.'
            }
          </p>
          {!searchTerm && isSuperAdmin && (
            <div className="mt-6">
              <button
                onClick={() => {
                  setParentDepartmentForSub(null);
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:opacity-90 transition-all shadow-sm"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Department
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((department) => (
            <Link
              key={department.id}
              href={`/admin/dashboard/departments/${department.id}`}
              className="group block bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
                    <BuildingOfficeIcon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate group-hover:text-amber-700 transition-colors">
                      {department.name}
                    </h3>
                    {department.description && (
                      <p className="text-sm text-slate-500 line-clamp-2 mt-0.5">
                        {department.description}
                      </p>
                    )}
                  </div>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-slate-400 shrink-0 group-hover:text-amber-600 transition-colors" />
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <UserIcon className="h-4 w-4" />
                  {department.admin.name}
                </span>
                <span className="text-slate-400">·</span>
                <span>{department._count?.groups ?? 0} groups</span>
                <span>{department._count?.users ?? 0} users</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newPageSize) => {
              setPageSize(newPageSize);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {showCreateModal && (
        <CreateDepartmentModal
          onClose={() => {
            setShowCreateModal(false);
            setParentDepartmentForSub(null);
            setEditingDepartment(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setParentDepartmentForSub(null);
            setEditingDepartment(null);
            fetchDepartments();
          }}
          departments={departments}
          parentDepartmentId={parentDepartmentForSub}
          editingDepartment={editingDepartment}
        />
      )}
    </div>
  );
}

interface CreateDepartmentModalProps {
  onClose: () => void;
  onSuccess: () => void;
  departments: Department[];
  parentDepartmentId?: string | null;
  editingDepartment?: Department | null;
}

function CreateDepartmentModal({ onClose, onSuccess, departments, parentDepartmentId, editingDepartment }: CreateDepartmentModalProps) {
  const [formData, setFormData] = useState({
    name: editingDepartment?.name || '',
    description: editingDepartment?.description || '',
    parentId: parentDepartmentId || editingDepartment?.parentId || '',
    adminName: editingDepartment?.admin?.name || '',
    adminEmail: editingDepartment?.admin?.email || '',
    adminPassword: ''
  });

  // Set current password for display when editing
  React.useEffect(() => {
    if (editingDepartment?.admin) {
      // For editing, we'll show a placeholder that indicates there's a current password
      setCurrentPassword(''); // Don't pre-fill with masked password
      setFormData(prev => ({
        ...prev,
        adminPassword: '' // Keep password field empty for optional updates
      }));
    } else {
      setCurrentPassword('');
    }
  }, [editingDepartment]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = editingDepartment 
        ? `/api/admin/departments/${editingDepartment.id}`
        : '/api/admin/departments';
      
      const method = editingDepartment ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${editingDepartment ? 'update' : 'create'} department`);
      }

      toast.success(editingDepartment ? 'Department updated successfully' : 'Department created successfully');
      onSuccess();
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 lg:left-64 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            {editingDepartment 
              ? 'Edit Department' 
              : parentDepartmentId 
                ? 'Create Sub-Department' 
                : 'Create New Department'
            }
          </h3>
          <p className="text-sm font-medium text-slate-500 mt-1">
            {editingDepartment
              ? 'Update department information and admin details.'
              : parentDepartmentId 
                ? 'Create a sub-department under the selected parent department.'
                : 'Create a department and assign an administrator to manage it.'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
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
                  <h4 className="font-bold text-slate-800 tracking-tight text-sm">Department Details</h4>
                  <div className="h-0.5 w-8 bg-blue-500 mt-1 rounded-full"></div>
                </div>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
                    Department Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group/input">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-blue-500 transition-colors">
                      <BuildingOfficeIcon className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-slate-50/30"
                      placeholder="e.g., Global Engineering"
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
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={5}
                      className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400 resize-none bg-slate-50/30"
                      placeholder="Briefly describe the department's role..."
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
                    Admin Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group/input">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-amber-500 transition-colors">
                      <UserIcon className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.adminName}
                      onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                      className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-50 focus:border-amber-500 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-slate-50/30"
                      placeholder="e.g., John Smith"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
                    Admin Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group/input">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-amber-500 transition-colors">
                      <EnvelopeIcon className="h-5 w-5" />
                    </div>
                    <input
                      type="email"
                      required
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                      className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-50 focus:border-amber-500 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-slate-50/30"
                      placeholder="admin@organization.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
                    Admin Password {!editingDepartment && <span className="text-red-500">*</span>}
                  </label>
                  
                  <div className="relative group/input">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-amber-500 transition-colors">
                      <KeyIcon className="h-5 w-5" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required={!editingDepartment}
                      value={formData.adminPassword}
                      onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                      className="w-full pl-12 pr-12 py-3.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-50 focus:border-amber-500 transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400 bg-slate-50/30 "
                      placeholder={editingDepartment ? "Keep empty to remain unchanged" : "Secure password"}
                    />
                    {(formData.adminPassword || editingDepartment) && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-amber-600 transition-colors"
                      >
                        {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-start gap-2 mt-3 ml-1">
                    <div className="mt-0.5 p-0.5 bg-slate-100 rounded text-slate-400">
                      <ClipboardDocumentIcon className="h-3 w-3" />
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                      {editingDepartment 
                        ? "Password update is optional. Only enter if a change is required."
                        : "Minimum 8 characters. Must contain alpha-numeric and special characters."
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 p-8 bg-slate-50/50 border-t border-slate-100">
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
              className="px-8 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading 
                ? (editingDepartment ? 'Saving...' : 'Creating...') 
                : editingDepartment 
                  ? 'Update Department'
                  : (parentDepartmentId ? 'Create Sub-Department' : 'Create Department')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}