import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define the schema for a single idea
const ideaSchema = z.object({
  title: z.string().describe('Short, catchy name for the idea'),
  description: z.string().describe('Detailed, actionable description ready for Figma Make'),
  approach: z.enum(['mobile', 'web', 'dashboard', 'onboarding', 'feature']).describe('The prototype type'),
});

// Define the schema for the complete output (array of 3 ideas)
const outputSchema = z.object({
  ideas: z.array(ideaSchema),
});

// Use JsonOutputParser for simpler, more reliable parsing
const outputParser = new JsonOutputParser();

// Create dynamic prompt template that accepts count parameter
const createPromptTemplate = (count: number) => {
  return PromptTemplate.fromTemplate(`You are a UX design ideation assistant. Generate ${count} diverse UI/UX prototype ideas for the given HMW statement.

HMW: {hmw}

For each idea, provide:
- title: Short, catchy name (string)
- description: A detailed, actionable description that can be copied directly into Figma Make to generate a coded prototype. Include specific UI elements, interactions, features, and user flows. Be concrete about what the interface should look like and how it should behave. (3-5 sentences)
- approach: MUST be exactly one of: "mobile", "web", "dashboard", "onboarding", "feature" (string)

Think divergently - make each idea distinctly different. Vary the prototype types across the ${count} ideas:
- mobile: Mobile app interface (iOS/Android)
- web: Web application or website
- dashboard: Data visualization or admin dashboard
- onboarding: User onboarding flow or tutorial
- feature: Specific feature or interaction pattern

DESCRIPTION FORMAT: Write descriptions as if you're briefing a developer/designer for Figma Make. Include:
- What screens/components are needed
- What interactions/animations should happen
- What data is displayed and how
- Key UI elements (buttons, forms, cards, modals, etc.)
- User flow and navigation
- Visual style hints (colors, spacing, layout)

Example: "Create a mobile onboarding screen with a progress bar at the top showing 3 steps. Include an animated character that reacts to user input. Add a smart form that auto-fills name and email using device data, with inline validation that shows green checkmarks as fields are completed. Include a floating 'Skip' button and a prominent 'Continue' CTA that pulses when all fields are valid. Use a clean white background with blue accents."

Return your response as a JSON object with this EXACT structure (with ${count} ideas in the array):
{{
  "ideas": [
    {{
      "title": "Idea Title",
      "description": "Detailed, Make-ready description with specific UI elements and interactions...",
      "approach": "mobile"
    }}
    // ... ${count} ideas total
  ]
}}

IMPORTANT: 
- Output ONLY the JSON object
- Generate exactly ${count} ideas
- Do NOT include markdown code fences like \`\`\`json
- Do NOT include any explanatory text before or after the JSON
- Ensure the JSON is valid and parseable`);
};

// Initialize the LLM model (configurable: Anthropic or Gemini)
// Set LLM_PROVIDER in .env to 'anthropic' or 'gemini' (default: gemini)
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'gemini';

// Create model instance (used per request)
const createModel = () => {
  return LLM_PROVIDER === 'anthropic'
    ? new ChatAnthropic({
        modelName: 'claude-3-5-sonnet-20250110',
        temperature: 0.7,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      })
    : new ChatGoogleGenerativeAI({
        modelName: 'gemini-2.5-flash',
        temperature: 0.7,
        apiKey: process.env.GOOGLE_API_KEY,
      });
};

/**
 * Generate diverse prototype ideas for a given HMW statement
 * @param hmw - The "How Might We" statement to ideate on
 * @param count - Number of ideas to generate (3-15)
 * @returns Promise containing an array of N diverse prototype ideas
 */
export async function generateHMWIdeas(hmw: string, count: number = 3) {
  try {
    // Create chain dynamically based on count
    const promptTemplate = createPromptTemplate(count);
    const model = createModel();
    const chain = promptTemplate.pipe(model).pipe(outputParser);
    
    const result = await chain.invoke({ hmw });
    
    // Validate with Zod schema
    const validated = outputSchema.parse(result);
    
    // Additional validation: check we got the right number of ideas
    if (validated.ideas.length !== count) {
      console.warn(`Expected ${count} ideas, got ${validated.ideas.length}`);
    }

    return {
      success: true,
      data: validated,
    };
  } catch (error) {
    console.error('Error generating HMW ideas:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Test function to validate the agent with a sample HMW
 */
export async function testHMWAgent() {
  console.log('🧪 Testing HMW Ideation Agent...\n');
  
  const testHMW = 'How might we help busy professionals maintain work-life balance?';
  console.log(`📝 Test HMW: "${testHMW}"\n`);
  
  const result = await generateHMWIdeas(testHMW);
  
  if (result.success) {
    console.log('✅ Agent generated ideas successfully!\n');
    console.log(JSON.stringify(result.data, null, 2));
    console.log('\n✨ All ideas are creative and varied!');
  } else {
    console.error('❌ Agent failed:', result.error);
  }
}

// Export types for use in other files
export type Idea = z.infer<typeof ideaSchema>;
export type HMWOutput = z.infer<typeof outputSchema>;

// Allow running this file directly for testing
if (require.main === module) {
  testHMWAgent()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}
