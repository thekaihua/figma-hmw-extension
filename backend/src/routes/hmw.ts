import { Router, Request, Response } from 'express';
import { generateHMWIdeas } from '../agents/hmwAgent';

const router = Router();

/**
 * POST /api/hmw/generate
 * Generate 3 diverse solution ideas for an HMW statement
 * 
 * Request body:
 * {
 *   "hmw": "How might we help users save time during onboarding?"
 * }
 * 
 * Response:
 * {
 *   "ideas": [
 *     {
 *       "title": "Smart Pre-fill",
 *       "description": "Auto-populate forms...",
 *       "approach": "technical"
 *     },
 *     ...
 *   ]
 * }
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { hmw } = req.body;
    
    if (!hmw) {
      return res.status(400).json({
        error: 'Missing required field: hmw',
        message: 'Request body must include an "hmw" field with your How Might We statement'
      });
    }

    if (typeof hmw !== 'string') {
      return res.status(400).json({
        error: 'Invalid field type: hmw must be a string',
        message: 'The "hmw" field must be a string containing your How Might We statement'
      });
    }

    if (hmw.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid field value: hmw cannot be empty',
        message: 'Please provide a non-empty How Might We statement'
      });
    }

    // Call the LangChain agent
    const result = await generateHMWIdeas(hmw);

    if (!result.success) {
      return res.status(500).json({
        error: 'Failed to generate ideas',
        message: result.error || 'An unexpected error occurred while generating ideas'
      });
    }

    // Return the generated ideas
    return res.status(200).json(result.data);

  } catch (error) {
    console.error('Error in /api/hmw/generate:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
});

export default router;
