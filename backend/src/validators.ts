import { z } from 'zod';
import { getFieldByName } from './schemaLoader';

/**
 * Validation error for a specific field
 */
export interface FieldValidationError {
  field: string;
  message: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  success: boolean;
  errors: Record<string, string>;
}

/**
 * Field mapping from API field names to scraped schema field names
 * Only include fields that actually exist in the scraped schema
 */
const FIELD_MAPPING: Record<string, string> = {
  'enterpriseName': 'txtownername',
  'aadhaarNumber': 'txtadharno', 
  'panNumber': 'txtPan',
  'panName': 'txtPanName',
  'dateOfBirth': 'txtdob',
  'declaration': 'chkDecarationA' // Using the correct declaration field
};

/**
 * Required fields that must be present in submission
 */
const REQUIRED_FIELDS = [
  'enterpriseName',
  'aadhaarNumber', 
  'panNumber',
  'panName',
  'dateOfBirth',
  'declaration'
];

/**
 * Get the schema field name for a given API field name
 */
function getSchemaFieldName(apiFieldName: string): string {
  return FIELD_MAPPING[apiFieldName] || apiFieldName;
}

/**
 * Base Zod schema for request validation
 */
export const baseSubmissionSchema = z.object({
  enterpriseName: z.string().min(1, "Enterprise name is required"),
  aadhaarNumber: z.string().regex(/^\d{12}$/, "Aadhaar number must be exactly 12 digits"),
  panNumber: z.string().regex(/^[A-Z]{5}\d{4}[A-Z]{1}$/, "PAN must be in format ABCDE1234F"),
  panName: z.string().min(1, "PAN holder name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  declaration: z.boolean().refine(val => val === true, "Declaration must be accepted")
}).strict();

/**
 * Validate a single field value against scraped schema rules
 */
export function validateField(fieldName: string, value: unknown): string | null {
  try {
    // Map API field name to schema field name
    const schemaFieldName = getSchemaFieldName(fieldName);
    
    // Check if this is a known field from our mapping
    if (!FIELD_MAPPING[fieldName]) {
      // Skip validation for unknown fields
      return null;
    }
    
    const field = getFieldByName(schemaFieldName);
    
    if (!field) {
      console.warn(`Field ${fieldName} (mapped to ${schemaFieldName}) not found in scraped schema`);
      return `Field ${fieldName} not found in schema`;
    }
    
    // Check if field is required
    if (REQUIRED_FIELDS.includes(fieldName)) {
      if (value === undefined || value === null || value === '') {
        return `${fieldName} is required`;
      }
    }
    
    // Skip further validation if value is empty and not required
    if (!REQUIRED_FIELDS.includes(fieldName) && (value === undefined || value === null || value === '')) {
      return null;
    }
    
    // Convert value to string for pattern validation
    const stringValue = String(value);
    
    // Apply specific validation rules
    switch (fieldName) {
      case 'aadhaarNumber':
        if (!/^\d{12}$/.test(stringValue)) {
          return 'Aadhaar number must be exactly 12 digits';
        }
        break;
        
      case 'panNumber':
        if (!/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(stringValue)) {
          return 'PAN must be in format ABCDE1234F (5 letters, 4 digits, 1 letter)';
        }
        break;
        
      case 'declaration':
        if (typeof value !== 'boolean' || value !== true) {
          return 'Declaration must be accepted (true)';
        }
        break;
        
      case 'enterpriseName':
      case 'panName':
        if (typeof value !== 'string' || stringValue.trim().length === 0) {
          return `${fieldName} cannot be empty`;
        }
        break;
        
      case 'dateOfBirth':
        if (typeof value !== 'string' || stringValue.trim().length === 0) {
          return 'Date of birth is required';
        }
        // Basic date format validation (DD/MM/YYYY or similar)
        if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(stringValue)) {
          return 'Date of birth must be in DD/MM/YYYY format';
        }
        break;
    }
    
    return null; // No validation errors
    
  } catch (error) {
    console.error(`Validation error for field ${fieldName}:`, error);
    return `Validation failed for ${fieldName}`;
  }
}

/**
 * Validate an entire form submission
 */
export function validateSubmission(data: Record<string, unknown>): ValidationResult {
  const errors: Record<string, string> = {};
  
  try {
    // First check that all required fields are present
    for (const requiredField of REQUIRED_FIELDS) {
      if (!(requiredField in data)) {
        errors[requiredField] = `${requiredField} is required`;
      }
    }
    
    // Then validate each field that is present
    for (const [fieldName, value] of Object.entries(data)) {
      // Only validate fields that are in our mapping (from scraped schema)
      if (FIELD_MAPPING[fieldName]) {
        const error = validateField(fieldName, value);
        if (error) {
          errors[fieldName] = error;
        }
      }
    }
    
    return {
      success: Object.keys(errors).length === 0,
      errors
    };
    
  } catch (error) {
    console.error('Validation error:', error);
    return {
      success: false,
      errors: { _general: 'Validation failed due to internal error' }
    };
  }
}

/**
 * Zod schema for validation endpoint
 */
export const validateRequestSchema = z.object({
  // Accept any object structure for dynamic validation
}).passthrough();

/**
 * Zod schema for submission endpoint  
 */
export const submitRequestSchema = z.object({
  // Accept any object structure for dynamic validation
}).passthrough();

/**
 * Sanitize and prepare data for database storage
 */
export function sanitizeSubmissionData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Only include fields that are in our mapping
    if (FIELD_MAPPING[key]) {
      // Sanitize string values
      if (typeof value === 'string') {
        sanitized[key] = value.trim();
      } else {
        sanitized[key] = value;
      }
    }
  }
  
  // Add metadata
  sanitized['_submittedAt'] = new Date().toISOString();
  sanitized['_version'] = '1.0';
  
  return sanitized;
}