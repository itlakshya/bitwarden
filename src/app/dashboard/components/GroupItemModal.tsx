'use client';

import { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface FieldDefinition {
  id: string;
  name: string;
  type: string;
  required: boolean;
  encrypted: boolean;
  placeholder?: string;
}

interface GroupItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  group: {
    id: string;
    name: string;
    fieldDefinitions: FieldDefinition[];
  };
  loading?: boolean;
  initialValues?: Record<string, string>;
  mode?: 'add' | 'edit';
}

export default function GroupItemModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  group, 
  loading = false,
  initialValues,
  mode = 'add',
}: GroupItemModalProps) {
  const [formData, setFormData] = useState<{ values: Record<string, string> }>({
    values: {},
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    // Always reset when modal opens or switches mode/group/item
    setErrors({});
    setFormData({
      values: mode === 'edit' ? { ...(initialValues || {}) } : {},
    });
  }, [isOpen, mode, group.id, initialValues]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const newErrors: Record<string, string> = {};
    
    group.fieldDefinitions.forEach(field => {
      if (field.required && !formData.values[field.id]?.trim()) {
        newErrors[field.id] = `${field.name} is required`;
      }
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Convert values to API format
    const values = group.fieldDefinitions
      .filter(field => formData.values[field.id])
      .map(field => ({
        fieldDefinitionId: field.id,
        value: formData.values[field.id]
      }));
    
    // Derive a title for the item from the first non-empty field, or fallback
    const firstValueField = group.fieldDefinitions.find(
      (field) => formData.values[field.id] && formData.values[field.id].trim()
    );
    const derivedTitle =
      (firstValueField && formData.values[firstValueField.id].trim()) ||
      `${group.name} Item`;

    onSubmit({
      title: derivedTitle,
      values
    });
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      values: {
        ...prev.values,
        [fieldId]: value
      }
    }));
    
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const renderField = (field: FieldDefinition) => {
    const value = formData.values[field.id] || '';
    const hasError = !!errors[field.id];
    
    const baseClasses = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 transition-colors ${
      hasError 
        ? 'border-red-300 focus:border-red-500' 
        : 'border-slate-300 focus:border-amber-500'
    }`;

    switch (field.type) {
      case 'TEXTAREA':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className={baseClasses}
            required={field.required}
          />
        );
      
      case 'EMAIL':
        return (
          <input
            type="email"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={baseClasses}
            required={field.required}
          />
        );
      
      case 'URL':
        return (
          <input
            type="url"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={baseClasses}
            required={field.required}
          />
        );
      
      case 'NUMBER':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={baseClasses}
            required={field.required}
          />
        );
      
      case 'PASSWORD':
        return (
          <input
            type="password"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={baseClasses}
            required={field.required}
          />
        );
      
      default: // TEXT
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={baseClasses}
            required={field.required}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            {mode === 'edit' ? 'Edit Item' : `Add Item to ${group.name}`}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Dynamic Fields */}
          {group.fieldDefinitions.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-900 border-b border-slate-200 pb-2">
                Fields
              </h3>
              
              {group.fieldDefinitions.map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {field.name}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                    {field.encrypted && (
                      <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
                        Encrypted
                      </span>
                    )}
                  </label>
                  {renderField(field)}
                  {errors[field.id] && (
                    <p className="mt-1 text-sm text-red-600">{errors[field.id]}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? (mode === 'edit' ? 'Saving...' : 'Adding...') : mode === 'edit' ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}