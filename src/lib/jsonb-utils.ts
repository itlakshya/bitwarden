/**
 * JSONB Utilities for Dynamic Field Management
 * 
 * This module provides utilities for working with JSONB data in PostgreSQL
 * to optimize performance when dealing with dynamic fields.
 */

import type { FieldDefinition } from '@prisma/client';
import { encrypt, decrypt } from './encryption';

export interface DynamicFieldValue {
  fieldId: string;
  fieldName: string;
  value: string;
  type: string;
  encrypted?: boolean;
}

export interface JsonBData {
  [fieldId: string]: {
    name: string;
    value: string;
    type: string;
  };
}

/**
 * Convert field values to JSONB format for non-encrypted fields
 * Encrypted fields will still use the FieldValue table
 */
export function convertToJsonB(
  fieldValues: Array<{
    fieldDefinitionId: string;
    fieldDefinition: FieldDefinition;
    value: string;
  }>
): { jsonbData: JsonBData; encryptedFields: Array<{ fieldDefinitionId: string; value: string }> } {
  const jsonbData: JsonBData = {};
  const encryptedFields: Array<{ fieldDefinitionId: string; value: string }> = [];

  fieldValues.forEach(({ fieldDefinitionId, fieldDefinition, value }) => {
    if (fieldDefinition.encrypted) {
      // Store encrypted fields in separate FieldValue table
      encryptedFields.push({ fieldDefinitionId, value });
    } else {
      // Store non-encrypted fields in JSONB for better performance
      jsonbData[fieldDefinitionId] = {
        name: fieldDefinition.name,
        value: value,
        type: fieldDefinition.type
      };
    }
  });

  return { jsonbData, encryptedFields };
}

/**
 * Extract field values from JSONB data and FieldValue records
 */
export function extractFromJsonB(
  jsonbData: JsonBData | null,
  fieldValues: Array<{
    fieldDefinitionId: string;
    fieldDefinition: FieldDefinition;
    value?: string;
    encryptedValue?: string;
  }>
): DynamicFieldValue[] {
  const result: DynamicFieldValue[] = [];

  // Add non-encrypted fields from JSONB
  if (jsonbData) {
    Object.entries(jsonbData).forEach(([fieldId, data]) => {
      result.push({
        fieldId,
        fieldName: data.name,
        value: data.value,
        type: data.type,
        encrypted: false
      });
    });
  }

  // Add encrypted fields from FieldValue table
  fieldValues.forEach(({ fieldDefinitionId, fieldDefinition, value, encryptedValue }) => {
    let decryptedValue = value;
    
    if (encryptedValue && fieldDefinition.encrypted) {
      try {
        decryptedValue = decrypt(encryptedValue);
      } catch (error) {
        console.error('Failed to decrypt field value:', error);
        decryptedValue = '[ENCRYPTED]';
      }
    }

    result.push({
      fieldId: fieldDefinitionId,
      fieldName: fieldDefinition.name,
      value: decryptedValue || '',
      type: fieldDefinition.type,
      encrypted: fieldDefinition.encrypted
    });
  });

  return result;
}

/**
 * Update JSONB data with new field values
 */
export function updateJsonBData(
  currentJsonB: JsonBData | null,
  updates: Array<{
    fieldDefinitionId: string;
    fieldDefinition: FieldDefinition;
    value: string;
  }>
): JsonBData {
  const jsonbData: JsonBData = currentJsonB ? { ...currentJsonB } : {};

  updates.forEach(({ fieldDefinitionId, fieldDefinition, value }) => {
    if (!fieldDefinition.encrypted) {
      jsonbData[fieldDefinitionId] = {
        name: fieldDefinition.name,
        value: value,
        type: fieldDefinition.type
      };
    }
  });

  return jsonbData;
}

/**
 * Search within JSONB data using PostgreSQL's JSONB operators
 * This generates SQL conditions for JSONB queries
 */
export function buildJsonBSearchCondition(
  searchTerm: string,
  fieldIds?: string[]
): string {
  if (!searchTerm) return '';

  const conditions: string[] = [];
  
  if (fieldIds && fieldIds.length > 0) {
    // Search specific fields
    fieldIds.forEach(fieldId => {
      conditions.push(`(dynamic_data->>'${fieldId}'->>'value') ILIKE '%${searchTerm}%'`);
    });
  } else {
    // Search all JSONB values
    conditions.push(`dynamic_data::text ILIKE '%${searchTerm}%'`);
  }

  return conditions.join(' OR ');
}

/**
 * Validate JSONB data structure
 */
export function validateJsonBData(data: any): data is JsonBData {
  if (!data || typeof data !== 'object') return false;

  return Object.values(data).every(field => 
    typeof field === 'object' &&
    field !== null &&
    'name' in field &&
    'value' in field &&
    'type' in field &&
    typeof field.name === 'string' &&
    typeof field.value === 'string' &&
    typeof field.type === 'string'
  );
}

/**
 * Performance monitoring utilities
 */
export const JsonBPerformance = {
  /**
   * Log JSONB query performance
   */
  logQuery: (operation: string, startTime: number) => {
    const duration = Date.now() - startTime;
    if (duration > 100) { // Log slow queries
      console.warn(`Slow JSONB query detected: ${operation} took ${duration}ms`);
    }
  },

  /**
   * Estimate JSONB storage size
   */
  estimateSize: (data: JsonBData): number => {
    return JSON.stringify(data).length;
  },

  /**
   * Check if JSONB approach is beneficial
   */
  shouldUseJsonB: (fieldCount: number, updateFrequency: 'low' | 'medium' | 'high'): boolean => {
    // Use JSONB for multiple fields with low-medium update frequency
    if (fieldCount >= 3 && updateFrequency !== 'high') return true;
    
    // Use traditional approach for single fields or high-frequency updates
    return false;
  }
};