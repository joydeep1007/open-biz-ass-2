import fs from 'fs';

/**
 * Field definition from the scraped schema
 */
export interface SchemaField {
  tag: string;
  type: string;
  name: string;
  id: string;
  class: string;
  placeholder: string;
  maxlength: string;
  minlength: string;
  required: boolean;
  pattern: string;
  value: string;
  title: string;
  autocomplete: string;
  min: string;
  max: string;
  step: string;
  aria_label: string;
  aria_required: string;
  aria_describedby: string;
  aria_invalid: string;
  label: string;
  visible: boolean;
  enabled: boolean;
  readonly: boolean;
  validation_rules: Record<string, any>;
  options?: Array<{
    value: string;
    text: string;
    selected: boolean;
  }>;
}

/**
 * Step definition from the scraped schema
 */
export interface SchemaStep {
  id: number;
  title: string;
  fields: SchemaField[];
  field_count: number;
}

/**
 * Complete schema structure
 */
export interface UdyamSchema {
  url: string;
  scraped_at: string;
  steps: SchemaStep[];
}

let loadedSchema: UdyamSchema | null = null;

/**
 * Load the Udyam registration schema from JSON file
 */
export async function loadSchema(schemaPath: string): Promise<UdyamSchema> {
  try {
    console.log(`📋 Loading schema from: ${schemaPath}`);

    // Check if file exists
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }

    // Read and parse JSON file
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    const schema: UdyamSchema = JSON.parse(schemaContent);

    // Validate schema structure
    if (!schema.steps || !Array.isArray(schema.steps)) {
      throw new Error('Invalid schema: missing or invalid steps array');
    }

    // Cache the loaded schema
    loadedSchema = schema;

    const totalFields = schema.steps.reduce((sum, step) => sum + step.field_count, 0);
    console.log(`✅ Schema loaded successfully`);
    console.log(`   Steps: ${schema.steps.length}`);
    console.log(`   Total Fields: ${totalFields}`);
    console.log(`   Scraped At: ${schema.scraped_at}`);

    return schema;

  } catch (error) {
    console.error('❌ Failed to load schema:', error);
    throw new Error(`Failed to load schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get the currently loaded schema
 */
export function getLoadedSchema(): UdyamSchema {
  if (!loadedSchema) {
    throw new Error('Schema not loaded. Call loadSchema() first.');
  }
  return loadedSchema;
}

/**
 * Get all fields from all steps as a flat array
 */
export function getAllFields(): SchemaField[] {
  const schema = getLoadedSchema();
  return schema.steps.flatMap(step => step.fields);
}

/**
 * Get a field by its name
 */
export function getFieldByName(fieldName: string): SchemaField | undefined {
  const allFields = getAllFields();
  return allFields.find(field => {
    // Match by name (with or without ASP.NET prefix)
    const cleanName = field.name.replace('ctl00$ContentPlaceHolder1$', '');
    return field.name === fieldName || cleanName === fieldName;
  });
}

/**
 * Get validation rules for a specific field
 */
export function getFieldValidationRules(fieldName: string): {
  required: boolean;
  pattern?: string;
  type: string;
  maxlength?: number;
  minlength?: number;
  options?: Array<{ value: string; text: string; selected: boolean }>;
} {
  const field = getFieldByName(fieldName);

  if (!field) {
    throw new Error(`Field not found: ${fieldName}`);
  }

  const result: {
    required: boolean;
    pattern?: string;
    type: string;
    maxlength?: number;
    minlength?: number;
    options?: Array<{ value: string; text: string; selected: boolean }>;
  } = {
    required: field.required || field.aria_required === 'true',
    type: field.type || field.tag,
  };

  // Only add optional properties if they have actual values
  if (field.pattern && field.pattern.trim() !== '') {
    result.pattern = field.pattern;
  }

  if (field.maxlength && field.maxlength.trim() !== '') {
    const maxLength = parseInt(field.maxlength, 10);
    if (!isNaN(maxLength)) {
      result.maxlength = maxLength;
    }
  }

  if (field.minlength && field.minlength.trim() !== '') {
    const minLength = parseInt(field.minlength, 10);
    if (!isNaN(minLength)) {
      result.minlength = minLength;
    }
  }

  if (field.options && field.options.length > 0) {
    result.options = field.options;
  }

  return result;
}