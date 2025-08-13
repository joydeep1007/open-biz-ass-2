import { z } from 'zod';
import { getFieldByName, getFieldValidationRules } from './schemaLoader';

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
 */
const FIELD_MAPPING: Record<string, string> = {
  // Basic enterprise info
  'enterpriseName': 'txtownername',
  'enterpriseType': 'ddlTypeofOrg', 
  'aadhaarNumber': 'txtadharno',
  'panNumber': 'txtPan',
  'panName': 'txtPanName',
  'dateOfBirth': 'txtdob',
  
  // Add more mappings as needed for other fields
  // These would need to be mapped based on the actual scraped schema
  'socialCategory': 'ddlSocialCategory',
  'gender': 'ddlGender',
  'physicallyHandicapped': 'chkPhysicallyHandicapped',
  'declaration': 'chkDecarationP'
};

/**
 * Get the schema field name for a given API field name
 */
function getSchemaFieldName(apiFieldName: string): string {
  return FIELD_MAPPING[apiFieldName] || apiFieldName;
}

/**
 * Basic validation for common fields when not found in schema
 */
function validateBasicField(fieldName: string, value: unknown): string | null {
  // Required fields that should always be validated
  const requiredFields = [
    'enterpriseName', 'enterpriseType', 'socialCategory', 'gender', 
    'declaration', 'aadhaarNumber', 'panNumber'
  ];
  
  if (requiredFields.includes(fieldName)) {
    if (value === undefined || value === null || value === '') {
      return `${fieldName} is required`;
    }
  }
  
  // Type-specific validation
  const stringValue = String(value);
  
  switch (fieldName) {
    case 'enterpriseType':
      const validTypes = ['Manufacturing', 'Service', 'Trading'];
      if (!validTypes.includes(stringValue)) {
        return `Enterprise type must be one of: ${validTypes.join(', ')}`;
      }
      break;
      
    case 'socialCategory':
      const validCategories = ['General', 'SC', 'ST', 'OBC'];
      if (!validCategories.includes(stringValue)) {
        return `Social category must be one of: ${validCategories.join(', ')}`;
      }
      break;
      
    case 'gender':
      const validGenders = ['Male', 'Female', 'Other'];
      if (!validGenders.includes(stringValue)) {
        return `Gender must be one of: ${validGenders.join(', ')}`;
      }
      break;
      
    case 'declaration':
      if (typeof value !== 'boolean' || value !== true) {
        return 'Declaration must be accepted (true)';
      }
      break;
      
    case 'aadhaarNumber':
      if (!/^\d{12}$/.test(stringValue)) {
        return 'Aadhaar number must be exactly 12 digits';
      }
      break;
      
    case 'panNumber':
      if (!/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(stringValue)) {
        return 'PAN must be in format: ABCDE1234F (5 letters, 4 digits, 1 letter)';
      }
      break;
      
    case 'pinCode':
      if (!/^\d{6}$/.test(stringValue)) {
        return 'Pin code must be exactly 6 digits';
      }
      break;
      
    case 'mobileNumber':
      if (!/^[6-9]\d{9}$/.test(stringValue.replace(/\D/g, ''))) {
        return 'Mobile number must be a valid 10-digit number';
      }
      break;
      
    case 'emailId':
    case 'email':
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stringValue)) {
        return 'Email must be a valid email address';
      }
      break;
      
    case 'physicallyHandicapped':
      if (typeof value !== 'boolean') {
        return 'Physically handicapped must be a boolean value';
      }
      break;
  }
  
  // Validate nested objects
  if (typeof value === 'object' && value !== null) {
    return validateNestedObject(fieldName, value as Record<string, unknown>);
  }
  
  return null; // No validation errors
}

/**
 * Validate nested objects like officialAddress, promoterDetails, etc.
 */
function validateNestedObject(objectName: string, obj: Record<string, unknown>): string | null {
  const errors: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fieldName = `${objectName}.${key}`;
    const error = validateBasicField(key, value);
    if (error) {
      errors.push(`${fieldName}: ${error}`);
    }
  }
  
  return errors.length > 0 ? errors.join('; ') : null;
}

/**
 * Base Zod schema for request validation
 */
export const baseSubmissionSchema = z.object({
  // Allow any additional properties for dynamic form fields
}).passthrough();

/**
 * Validate a single field value against schema rules
 */
export function validateField(fieldName: string, value: unknown): string | null {
  try {
    // Map API field name to schema field name
    const schemaFieldName = getSchemaFieldName(fieldName);
    const field = getFieldByName(schemaFieldName);
    
    if (!field) {
      // If field is not found in schema, provide basic validation for common fields
      return validateBasicField(fieldName, value);
    }
    
    const rules = getFieldValidationRules(schemaFieldName);
    
    // Check required
    if (rules.required) {
      if (value === undefined || value === null || value === '') {
        return `${fieldName} is required`;
      }
    }
    
    // Skip further validation if value is empty and not required
    if (!rules.required && (value === undefined || value === null || value === '')) {
      return null;
    }
    
    // Convert value to string for pattern and length validation
    const stringValue = String(value);
    
    // Check type-specific validation
    switch (rules.type) {
      case 'text':
      case 'email':
      case 'tel':
        if (typeof value !== 'string') {
          return `${fieldName} must be a string`;
        }
        break;
        
      case 'number':
        if (isNaN(Number(value))) {
          return `${fieldName} must be a valid number`;
        }
        break;
        
      case 'checkbox':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          return `${fieldName} must be a boolean value`;
        }
        break;
        
      case 'select':
        if (rules.options) {
          const validValues = rules.options.map(opt => opt.value);
          if (!validValues.includes(String(value))) {
            return `${fieldName} must be one of: ${validValues.join(', ')}`;
          }
        }
        break;
    }
    
    // Check pattern (regex validation)
    if (rules.pattern && stringValue) {
      try {
        const regex = new RegExp(rules.pattern);
        if (!regex.test(stringValue)) {
          // Provide specific error messages for common patterns
          if (fieldName.toLowerCase().includes('pan')) {
            return `PAN must be in format: ABCDE1234F (5 letters, 4 digits, 1 letter)`;
          } else if (fieldName.toLowerCase().includes('aadhaar') || fieldName.toLowerCase().includes('adhar')) {
            return `Aadhaar number must be 12 digits`;
          } else {
            return `${fieldName} format is invalid`;
          }
        }
      } catch (error) {
        console.warn(`Invalid regex pattern for field ${fieldName}:`, rules.pattern);
      }
    }
    
    // Check length constraints
    if (rules.maxlength && stringValue.length > rules.maxlength) {
      return `${field.label || fieldName} must not exceed ${rules.maxlength} characters`;
    }
    
    if (rules.minlength && stringValue.length < rules.minlength) {
      return `${field.label || fieldName} must be at least ${rules.minlength} characters`;
    }
    
    // Additional validation for specific field types
    if (fieldName.toLowerCase().includes('email')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(stringValue)) {
        return `${field.label || fieldName} must be a valid email address`;
      }
    }
    
    if (fieldName.toLowerCase().includes('mobile') || fieldName.toLowerCase().includes('phone')) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(stringValue.replace(/\D/g, ''))) {
        return `${field.label || fieldName} must be a valid 10-digit mobile number`;
      }
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
    // Validate each field in the submission
    for (const [fieldName, value] of Object.entries(data)) {
      const error = validateField(fieldName, value);
      if (error) {
        errors[fieldName] = error;
      }
    }
    
    // Check for missing required fields
    const requiredFields = [
      'enterpriseName', 'enterpriseType', 'socialCategory', 'gender', 'declaration'
    ];
    
    for (const fieldName of requiredFields) {
      if (!(fieldName in data)) {
        errors[fieldName] = `${fieldName} is required`;
      }
    }
    
    // Validate required nested fields
    const officialAddress = data['officialAddress'] as Record<string, unknown>;
    if (officialAddress) {
      const requiredAddressFields = ['state', 'district', 'pinCode', 'mobileNumber', 'emailId'];
      for (const field of requiredAddressFields) {
        if (!officialAddress[field]) {
          errors[`officialAddress.${field}`] = `${field} is required in official address`;
        }
      }
    } else {
      errors['officialAddress'] = 'Official address is required';
    }
    
    const promoterDetails = data['promoterDetails'] as Record<string, unknown>;
    if (promoterDetails) {
      const requiredPromoterFields = ['name', 'mobileNumber', 'emailId'];
      for (const field of requiredPromoterFields) {
        if (!promoterDetails[field]) {
          errors[`promoterDetails.${field}`] = `${field} is required in promoter details`;
        }
      }
    } else {
      errors['promoterDetails'] = 'Promoter details are required';
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
    // Remove any potentially dangerous properties
    if (key.startsWith('__') || key.includes('prototype')) {
      continue;
    }
    
    // Sanitize string values
    if (typeof value === 'string') {
      sanitized[key] = value.trim();
    } else {
      sanitized[key] = value;
    }
  }
  
  // Add metadata using bracket notation for strict TypeScript compliance
  sanitized['_submittedAt'] = new Date().toISOString();
  sanitized['_version'] = '1.0';
  
  return sanitized;
}