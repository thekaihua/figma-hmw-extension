import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define the schema for a single idea
const ideaSchema = z.object({
  title: z.string().describe('Short, catchy name for the idea'),
  description: z.string().describe('2-3 sentences explaining the concept'),
  approach: z.enum(['technical', 'service', 'behavioral']).describe('The approach type for this solution'),
});

// Define the schema for the complete output (array of 3 ideas)
const outputSchema = z.object({
  ideas: z.array(ideaSchema).length(3).describe('Array of exactly 3 diverse solution ideas'),
});

// Create the output parser
const outputParser = StructuredOutputParser.fromZodSchema(outputSchema);

// Create the prompt template with divergent thinking instructions
const promptTemplate = PromptTemplate.fromTemplate(`You are a UX design ideation assistant. Given an HMW statement, generate 3 diverse solution ideas.

HMW: {hmw}

For each idea, provide:
- Title: Short, catchy name
- Description: 2-3 sentences explaining the concept
- Approach: (technical/service/behavioral)

Think divergently - make each idea distinctly different. One should focus on technical innovation, one on service/process design, and one on behavioral or human-centered approaches.

{format_instructions}

Generate creative and varied ideas that explore different dimensions of the problem space.`);

// Initialize the LLM model (configurable: Anthropic or Gemini)
// Set LLM_PROVIDER in .env to 'anthropic' or 'gemini' (default: gemini)
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'gemini';

const model = LLM_PROVIDER === 'anthropic'
  ? new ChatAnthropic({
      modelName: 'claude-3-5-sonnet-20250110',
      temperature: 0.8,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    })
  : new ChatGoogleGenerativeAI({
      modelName: 'gemini-2.5-flash', // Latest model with free tier!
      temperature: 0.8,
      apiKey: process.env.GOOGLE_API_KEY,
    });

// Create the chain: prompt → model → parser
const chain = promptTemplate.pipe(model).pipe(outputParser);

/**
 * Generate diverse solution ideas for a given HMW statement
 * @param hmw - The "How Might We" statement to ideate on
 * @returns Promise containing an array of 3 diverse ideas
 */
export async function generateHMWIdeas(hmw: string) {
  try {
    const formatInstructions = outputParser.getFormatInstructions();
    
    const result = await chain.invoke({
      hmw,
      format_instructions: formatInstructions,
    });

    return {
      success: true,
      data: result,
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
