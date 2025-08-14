import { useState } from 'react';
import { apiService, convertToBackendFormat } from '../services/api';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
  fieldErrors: Record<string, string>;
}

export const useFormValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = async (formData: Record<string, any>): Promise<ValidationResult> => {
    setIsValidating(true);
    
    try {
      console.log('Validating form data:', formData);
      
      // Convert frontend data to backend format
      const backendData = convertToBackendFormat(formData);
      console.log('Frontend data:', formData);
      console.log('Backend format data:', backendData);
      
      const response = await apiService.validateForm(backendData);
      
      if (response.success) {
        return {
          success: true,
          errors: [],
          fieldErrors: {}
        };
      } else {
        const errors: ValidationError[] = [];
        const fieldErrors: Record<string, string> = {};
        
        if (response.errors) {
          Object.entries(response.errors).forEach(([field, message]) => {
            errors.push({ field, message });
            fieldErrors[field] = message;
          });
        }
        
        return {
          success: false,
          errors,
          fieldErrors
        };
      }
    } catch (error) {
      console.error('Validation failed:', error);
      return {
        success: false,
        errors: [{ field: 'general', message: error instanceof Error ? error.message : 'Validation failed' }],
        fieldErrors: { general: error instanceof Error ? error.message : 'Validation failed' }
      };
    } finally {
      setIsValidating(false);
    }
  };

  const submitForm = async (formData: Record<string, any>) => {
    setIsSubmitting(true);
    
    try {
      console.log('Submitting form data:', formData);
      
      // First validate
      const validationResult = await validateForm(formData);
      
      if (!validationResult.success) {
        return {
          success: false,
          errors: validationResult.errors,
          fieldErrors: validationResult.fieldErrors
        };
      }
      
      // Convert frontend data to backend format
      const backendData = convertToBackendFormat(formData);
      console.log('Submitting backend format data:', backendData);
      
      const response = await apiService.submitForm(backendData);
      
      if (response.success) {
        return {
          success: true,
          id: response.id,
          message: response.message,
          submittedAt: response.submittedAt
        };
      } else {
        return {
          success: false,
          error: response.error || 'Submission failed',
          message: response.message
        };
      }
    } catch (error) {
      console.error('Submission failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Submission failed'
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    validateForm,
    submitForm,
    isValidating,
    isSubmitting
  };
};