import { Router, Request, Response } from 'express';
import { getLoadedSchema } from '../schemaLoader';
import { validateSubmission, validateRequestSchema, submitRequestSchema, sanitizeSubmissionData } from '../validators';
import { createSubmission, getSubmissions, getSubmissionById } from '../supabase';

const router = Router();

/**
 * GET /schema - Return the loaded schema
 */
router.get('/schema', (_req: Request, res: Response): void => {
  try {
    const schema = getLoadedSchema();

    res.json({
      success: true,
      data: schema,
      meta: {
        totalSteps: schema.steps.length,
        totalFields: schema.steps.reduce((sum, step) => sum + step.field_count, 0),
        scrapedAt: schema.scraped_at
      }
    });
  } catch (error) {
    console.error('Error retrieving schema:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve schema',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /validate - Validate form data against schema
 */
router.post('/validate', async (req: Request, res: Response): Promise<void> => {
  try {
    // Basic request validation with Zod
    const parseResult = validateRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request format',
        details: parseResult.error.errors
      });
      return;
    }

    const data = parseResult.data;

    // Validate against schema
    const validationResult = validateSubmission(data);

    if (validationResult.success) {
      res.json({
        success: true,
        message: 'Validation passed',
        validatedFields: Object.keys(data).length
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: validationResult.errors
      });
    }

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal validation error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /submit - Validate and store form submission
 */
router.post('/submit', async (req: Request, res: Response): Promise<void> => {
  try {
    // Basic request validation with Zod
    const parseResult = submitRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request format',
        details: parseResult.error.errors
      });
      return;
    }

    const data = parseResult.data;

    // Validate against schema
    const validationResult = validateSubmission(data);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors: validationResult.errors
      });
      return;
    }

    // Sanitize data for storage
    const sanitizedData = sanitizeSubmissionData(data);

    // Store in database using Supabase
    const submission = await createSubmission(sanitizedData);

    console.log(`✅ New submission created with ID: ${submission.id}`);

    res.status(201).json({
      success: true,
      id: submission.id,
      message: 'Submission stored successfully',
      submittedAt: submission.created_at
    });

  } catch (error) {
    console.error('Submission error:', error);

    // Handle specific database errors
    if (error instanceof Error && error.message.includes('database')) {
      res.status(503).json({
        success: false,
        error: 'Database error',
        message: 'Unable to store submission. Please try again later.'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * GET /submissions - Get all submissions (for debugging/admin)
 */
router.get('/submissions', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt((req.query['page'] as string) || '1', 10) || 1;
    const limit = Math.min(parseInt((req.query['limit'] as string) || '10', 10) || 10, 100);

    const { data: submissions, count: total } = await getSubmissions(page, limit);

    res.json({
      success: true,
      data: submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch submissions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /submissions/:id - Get specific submission
 */
router.get('/submissions/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const idParam = req.params['id'];

    if (!idParam) {
      res.status(400).json({
        success: false,
        error: 'Missing submission ID'
      });
      return;
    }

    const id = parseInt(idParam, 10);

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid submission ID'
      });
      return;
    }

    const submission = await getSubmissionById(id);

    if (!submission) {
      res.status(404).json({
        success: false,
        error: 'Submission not found'
      });
      return;
    }

    res.json({
      success: true,
      data: submission
    });

  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch submission',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;