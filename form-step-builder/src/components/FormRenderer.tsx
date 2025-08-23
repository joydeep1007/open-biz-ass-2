import React, { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { useFormSchema, FormField, FormStep } from '../hooks/useFormSchema';
import { useFormValidation } from '../hooks/useFormValidation';
import { useToast } from '../hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle, Wifi } from 'lucide-react';

const FormRenderer: React.FC = () => {
  const { schema, loading, error } = useFormSchema();
  const { submitForm, isSubmitting } = useFormValidation();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Handle field value changes
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // Validate current step fields
  const validateCurrentStep = (): boolean => {
    const currentStepData = schema?.steps[currentStep - 1];
    if (!currentStepData) return false;

    const errors: Record<string, string> = {};
    let isValid = true;

    // Helper function to get nested field value
    const getFieldValue = (fieldName: string) => {
      if (fieldName.includes('.')) {
        const [parentKey, childKey] = fieldName.split('.');
        return formData[parentKey] ? formData[parentKey][childKey] : '';
      }
      return formData[fieldName];
    };

    currentStepData.fields.forEach(field => {
      if (field.type === 'submit' || field.type === 'button') return;

      const value = getFieldValue(field.name);
      
      // Check required fields
      if (field.required && (!value || value === '')) {
        errors[field.name] = `${field.label} is required`;
        isValid = false;
      }
      
      // Check pattern validation
      if (value && field.pattern) {
        const regex = new RegExp(field.pattern);
        if (!regex.test(value)) {
          if (field.name === 'aadhaarNumber') {
            errors[field.name] = 'Aadhaar number must be 12 digits';
          } else if (field.name === 'panNumber') {
            errors[field.name] = 'PAN must be in format: ABCDE1234F';
          } else if (field.pattern === '^[0-9]{6}$') {
            errors[field.name] = 'PIN Code must be 6 digits';
          } else if (field.pattern === '^[0-9]{10}$') {
            errors[field.name] = 'Mobile number must be 10 digits';
          } else if (field.pattern.includes('@')) {
            errors[field.name] = 'Please enter a valid email address';
          } else {
            errors[field.name] = `${field.label} format is invalid`;
          }
          isValid = false;
        }
      }
      
      // Check length validation
      if (value && field.maxLength && value.length > field.maxLength) {
        errors[field.name] = `${field.label} must not exceed ${field.maxLength} characters`;
        isValid = false;
      }
    });

    setFieldErrors(errors);
    return isValid;
  };

  // Handle next step
  const handleNext = () => {
    if (validateCurrentStep()) {
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps(prev => [...prev, currentStep]);
      }
      
      if (currentStep < (schema?.steps.length || 0)) {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before submitting",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await submitForm(formData);
      
      if (result.success) {
        toast({
          title: "Form Submitted Successfully!",
          description: `Your registration has been processed. Submission ID: ${result.id}`,
        });
        
        // Reset form
        setFormData({});
        setFieldErrors({});
        setCurrentStep(1);
        setCompletedSteps([]);
      } else {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        
        toast({
          title: "Submission Failed",
          description: result.error || "Please check the form for errors",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Submission Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Render individual form field
  // Render individual form field
  const renderField = (field: FormField) => {
    if (field.type === 'submit' || field.type === 'button') {
      return null; // Skip action buttons, we'll handle navigation separately
    }

    // Skip any checkbox field that has "Type of Organisation" in its label
    // This is the problematic field that should be a PAN declaration but has wrong labeling
    if (field.type === 'checkbox' && field.label && field.label.includes('Type of Organisation')) {
      return null;
    }

    // Helper function to get nested field value
    const getFieldValue = (fieldName: string) => {
      if (fieldName.includes('.')) {
        const [parentKey, childKey] = fieldName.split('.');
        return formData[parentKey] ? formData[parentKey][childKey] : '';
      }
      return formData[fieldName];
    };

    const value = getFieldValue(field.name) || '';
    const error = fieldErrors[field.name];

    switch (field.type) {
      case 'text':
      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.name}
              type={field.type}
              placeholder={field.placeholder}
              value={value}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange(field.name, e.target.value)}
              className={error ? 'border-red-500' : ''}
              maxLength={field.maxLength}
            />
            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Select 
              value={value} 
              onValueChange={(newValue: string) => handleFieldChange(field.name, newValue)}
            >
              <SelectTrigger className={error ? 'border-red-500' : ''}>
                <SelectValue placeholder={field.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox
                id={field.name}
                checked={!!value}
                onCheckedChange={(checked: boolean) => handleFieldChange(field.name, checked)}
                className={error ? 'border-red-500' : ''}
              />
              <Label
                htmlFor={field.name}
                className="text-sm leading-relaxed cursor-pointer"
              >
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </Label>
            </div>
            {error && (
              <p className="text-xs text-red-500 ml-7">{error}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading form schema from backend...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !schema) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Failed to Load Form</h2>
            <p className="text-gray-600 mb-4">
              {error || 'Unable to connect to the backend server'}
            </p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStepData = schema?.steps[currentStep - 1];
  const isLastStep = currentStep === (schema?.steps.length || 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">उ</span>
            </div>
            <div className="ml-4 text-left">
              <p className="text-sm text-gray-600">सूक्ष्म, लघु और मध्यम उद्यम मंत्रालय</p>
              <p className="text-xs text-gray-500">Ministry of Micro, Small & Medium Enterprises</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{schema.title}</h1>
          <p className="text-gray-600">{schema.subtitle}</p>
          
          {/* Connection Status */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <Wifi className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500">Connected to Backend API</span>
          </div>
        </div>

        {/* Step Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {schema?.steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentStep === index + 1 
                    ? 'bg-blue-600 text-white' 
                    : completedSteps.includes(index + 1)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }
                `}>
                  {completedSteps.includes(index + 1) ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700">
                  {step.title}
                </span>
                {index < (schema?.steps.length || 0) - 1 && (
                  <div className="w-16 h-0.5 bg-gray-200 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <Card className="shadow-lg">
          <CardHeader className="bg-blue-600 text-white">
            <CardTitle className="text-lg">
              Step {currentStep}: {currentStepData?.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {currentStepData?.fields.map(renderField)}

              {/* Show general errors */}
              {fieldErrors.general && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{fieldErrors.general}</AlertDescription>
                </Alert>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                >
                  Previous
                </Button>
                
                {isLastStep ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Registration'
                    )}
                  </Button>
                ) : (
                  <Button onClick={handleNext}>
                    Next
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Ministry of MSME | Udyog Bhawan - New Delhi</p>
          <p className="mt-1">Email: champions@gov.in</p>
          <p className="mt-2 text-xs">
            Form fields loaded from backend • {schema?.meta.totalFields} fields • 
            Scraped on {new Date(schema?.meta.scrapedAt || '').toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FormRenderer;