/**
 * API Service for Udyam Registration Backend
 */

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:5000';

export interface BackendField {
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
    label: string;
    visible: boolean;
    enabled: boolean;
    readonly: boolean;
    options?: Array<{
        value: string;
        text: string;
        selected: boolean;
    }>;
}

export interface BackendStep {
    id: number;
    title: string;
    fields: BackendField[];
    field_count: number;
}

export interface BackendSchema {
    url: string;
    scraped_at: string;
    steps: BackendStep[];
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    errors?: Record<string, string>;
}

export interface SchemaResponse extends ApiResponse {
    data: BackendSchema;
    meta: {
        totalSteps: number;
        totalFields: number;
        scrapedAt: string;
    };
}

export interface ValidationResponse extends ApiResponse {
    message?: string;
    validatedFields?: number;
    errors?: Record<string, string>;
}

export interface SubmissionResponse extends ApiResponse {
    id: number;
    message: string;
    submittedAt: string;
}

class ApiService {
    private baseURL: string;

    constructor(baseURL: string = API_BASE_URL) {
        this.baseURL = baseURL;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseURL}${endpoint}`;

        const config: RequestInit = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        try {
            console.log(`API Request: ${options.method || 'GET'} ${url}`);
            if (options.body) {
                console.log('Request body:', options.body);
            }

            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                console.error('API Error Response:', data);
                throw new Error(data.error || data.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            console.log(`API Response:`, data);
            return data;
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }

    /**
     * Get the form schema from backend
     */
    async getSchema(): Promise<SchemaResponse> {
        return this.request<SchemaResponse>('/schema');
    }

    /**
     * Validate form data against backend
     */
    async validateForm(data: Record<string, any>): Promise<ValidationResponse> {
        return this.request<ValidationResponse>('/validate', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * Submit form data to backend
     */
    async submitForm(data: Record<string, any>): Promise<SubmissionResponse> {
        return this.request<SubmissionResponse>('/submit', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<ApiResponse> {
        return this.request<ApiResponse>('/');
    }
}

export const apiService = new ApiService();

/**
 * Helper function to clean field names (remove ASP.NET prefixes)
 */
export const cleanFieldName = (name: string): string => {
    return name.replace('ctl00$ContentPlaceHolder1$', '');
};

/**
 * Helper function to get user-friendly field names
 */
export const getFriendlyFieldName = (backendName: string): string => {
    const cleanName = cleanFieldName(backendName);

    const friendlyNames: Record<string, string> = {
        'txtadharno': 'aadhaarNumber',
        'txtownername': 'entrepreneurName',
        'ddlTypeofOrg': 'organizationType',
        'txtPan': 'panNumber',
        'txtPanName': 'panHolderName',
        'txtdob': 'dateOfBirth',
        'chkDecarationA': 'aadhaarConsent',
        'chkDecarationP': 'panConsent',
        'btnValidateAadhaar': 'validateAadhaar',
        'btnValidatePan': 'validatePan'
    };

    return friendlyNames[cleanName] || cleanName;
};

/**
 * Helper function to convert frontend data back to backend format
 * The backend expects API field names, not scraped field names
 */
export const convertToBackendFormat = (frontendData: Record<string, any>): Record<string, any> => {
    const backendData: Record<string, any> = {};

    // Map frontend field names to backend API field names
    const fieldMapping: Record<string, string> = {
        'aadhaarNumber': 'aadhaarNumber',
        'entrepreneurName': 'enterpriseName', 
        'organizationType': 'enterpriseType',
        'panNumber': 'panNumber',
        'panHolderName': 'panName',
        'dateOfBirth': 'dateOfBirth',
        'aadhaarConsent': 'declaration',
        'panConsent': 'declaration'
    };

    Object.entries(frontendData).forEach(([key, value]) => {
        const backendKey = fieldMapping[key] || key;
        backendData[backendKey] = value;
    });

    // Add required fields that the backend expects
    if (!backendData.enterpriseType && backendData.organizationType) {
        backendData.enterpriseType = backendData.organizationType;
    }
    
    if (!backendData.enterpriseName && backendData.entrepreneurName) {
        backendData.enterpriseName = backendData.entrepreneurName;
    }

    // Add default values for required fields if missing
    if (!backendData.socialCategory) {
        backendData.socialCategory = 'General';
    }
    
    if (!backendData.gender) {
        backendData.gender = 'Male';
    }

    // Ensure declaration is boolean and true
    if (backendData.declaration !== false) {
        backendData.declaration = true;
    }

    // Add mock nested objects if they don't exist
    if (!backendData.officialAddress) {
        backendData.officialAddress = {
            state: 'Delhi',
            district: 'New Delhi',
            pinCode: '110001',
            mobileNumber: '9999999999',
            emailId: 'test@example.com'
        };
    }

    if (!backendData.promoterDetails) {
        backendData.promoterDetails = {
            name: backendData.enterpriseName || 'Test Entrepreneur',
            mobileNumber: '9999999999',
            emailId: 'test@example.com'
        };
    }

    return backendData;
};

export default apiService;