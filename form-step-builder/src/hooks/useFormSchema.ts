import { useState, useEffect } from 'react';
import { apiService, BackendSchema, BackendField, getFriendlyFieldName, cleanFieldName } from '../services/api';

export interface FormField {
  id: string;
  name: string;
  backendName: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'submit' | 'button';
  placeholder?: string;
  required: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  options?: Array<{ value: string; label: string }>;
  visible: boolean;
  enabled: boolean;
  readonly: boolean;
}

export interface FormStep {
  id: number;
  title: string;
  fields: FormField[];
}

export interface FormSchema {
  title: string;
  subtitle: string;
  steps: FormStep[];
  meta: {
    totalSteps: number;
    totalFields: number;
    scrapedAt: string;
  };
}

/**
 * Convert backend field to frontend field format
 */
const convertBackendField = (backendField: BackendField): FormField => {
  const cleanName = cleanFieldName(backendField.name);
  const friendlyName = getFriendlyFieldName(backendField.name);

  return {
    id: backendField.id || cleanName,
    name: friendlyName,
    backendName: cleanName,
    label: backendField.label || cleanName,
    type: backendField.type === '' && backendField.tag === 'select' ? 'select' :
          backendField.type === 'submit' ? 'submit' :
          backendField.type === 'button' ? 'button' :
          backendField.type === 'checkbox' ? 'checkbox' :
          backendField.type === 'number' ? 'number' : 'text',
    placeholder: backendField.placeholder,
    required: backendField.required,
    maxLength: backendField.maxlength ? parseInt(backendField.maxlength, 10) : undefined,
    minLength: backendField.minlength ? parseInt(backendField.minlength, 10) : undefined,
    pattern: backendField.pattern || undefined,
    options: backendField.options?.map(opt => ({
      value: opt.value,
      label: opt.text
    })),
    visible: backendField.visible,
    enabled: backendField.enabled,
    readonly: backendField.readonly
  };
};

/**
 * Convert backend schema to frontend schema format
 */
const convertBackendSchema = (backendSchema: BackendSchema, meta: any): FormSchema => {
  const steps: FormStep[] = backendSchema.steps.map(step => ({
    id: step.id,
    title: step.title,
    fields: step.fields
      .filter(field => 
        // Only include visible form fields, exclude accessibility widgets
        field.visible && 
        !field.name.includes('uwaw') && 
        !field.name.includes('accessibility') &&
        field.name !== 'N/A' &&
        field.name.includes('ctl00$ContentPlaceHolder1$')
      )
      .map(convertBackendField)
  }));

  return {
    title: 'UDYAM REGISTRATION FORM',
    subtitle: 'For New Enterprise who are not Registered yet as MSME',
    steps,
    meta
  };
};

export const useFormSchema = () => {
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSchema = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Loading schema from backend...');
        const response = await apiService.getSchema();
        
        if (response.success && response.data) {
          const convertedSchema = convertBackendSchema(response.data, response.meta);
          setSchema(convertedSchema);
          console.log('Schema loaded successfully:', convertedSchema);
        } else {
          throw new Error(response.error || 'Failed to load schema');
        }
      } catch (error) {
        console.error('Failed to load form schema:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadSchema();
  }, []);

  return { schema, loading, error };
};