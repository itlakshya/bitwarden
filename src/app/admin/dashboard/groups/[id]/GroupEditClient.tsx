'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  BuildingOfficeIcon,
  PencilIcon,
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

type GroupFieldType = 'TEXT' | 'PASSWORD' | 'URL' | 'EMAIL' | 'NUMBER' | 'TEXTAREA';

interface GroupFieldDefinition {
  id?: string;
  name: string;
  type: GroupFieldType;
  required: boolean;
  encrypted: boolean;
  placeholder?: string | null;
  order: number;
  hasData?: boolean;
}

interface GroupEditClientProps {
  group: {
    id: string;
    name: string;
    description: string | null;
    department: { id: string; name: string };
    fieldDefinitions: GroupFieldDefinition[];
  };
}

export default function GroupEditClient({ group }: GroupEditClientProps) {
  const router = useRouter();
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [fieldDefinitions, setFieldDefinitions] = useState<GroupFieldDefinition[]>(
    group.fieldDefinitions.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      required: f.required,
      encrypted: f.encrypted,
      placeholder: f.placeholder || '',
      order: f.order,
    }))
  );
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
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/groups/${group.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          fieldDefinitions,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update group');
      }

      toast.success('Group updated successfully');
      router.push(`/admin/dashboard/departments/${group.department.id}`);
      router.refresh();
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : 'Failed to update group';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:p-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <BuildingOfficeIcon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              Edit group
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-0.5 text-xs font-medium text-slate-600">
                {group.department.name}
              </span>
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Update the group name, description, and fields. Changes apply to all items in this
              group.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Group name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Department
              </label>
              <input
                type="text"
                disabled
                value={group.department.name}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Describe what this group stores or how it should be used."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-slate-900">Fields</h2>
              <button
                type="button"
                onClick={addField}
                className="inline-flex items-center rounded-md bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add field
              </button>
            </div>

            {fieldDefinitions.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
                <p className="text-sm text-slate-500">
                  No fields defined yet. Add fields to structure data stored in this group.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {fieldDefinitions.map((field, index) => (
                  <div
                    key={field.id || index}
                    className="border border-slate-200 rounded-xl p-4 bg-slate-50/60"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Field name
                        </label>
                        <input
                          type="text"
                          required
                          value={field.name}
                          onChange={(e) => updateField(index, { name: e.target.value })}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Type
                        </label>
                        <select
                          value={field.type}
                          onChange={(e) =>
                            updateField(index, {
                              type: e.target.value as GroupFieldType,
                            })
                          }
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500"
                        >
                          {fieldTypes.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Placeholder
                        </label>
                        <input
                          type="text"
                          value={field.placeholder || ''}
                          onChange={(e) =>
                            updateField(index, { placeholder: e.target.value })
                          }
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500"
                          placeholder="Optional hint"
                        />
                      </div>
                      <div className="flex items-center justify-between md:justify-start md:space-x-3">
                        <label className="inline-flex items-center gap-1 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            className="h-3 w-3 rounded border-slate-300 text-purple-600"
                            checked={field.required}
                            onChange={(e) =>
                              updateField(index, { required: e.target.checked })
                            }
                          />
                          Required
                        </label>
                        <label className="inline-flex items-center gap-1 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            className="h-3 w-3 rounded border-slate-300 text-purple-600"
                            checked={field.encrypted}
                            onChange={(e) =>
                              updateField(index, { encrypted: e.target.checked })
                            }
                          />
                          Encrypted
                        </label>
                        <button
                          type="button"
                          onClick={() => removeField(index)}
                          className="ml-auto text-xs text-red-600 hover:underline"
                        >
                          <TrashIcon className="h-3 w-3 inline mr-1" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

