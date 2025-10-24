# HMW Ideation Agent

This directory contains LangChain agents for AI-powered ideation.

## HMW Agent (`hmwAgent.ts`)

A LangChain agent that generates 3 diverse solution ideas for "How Might We" (HMW) design challenge statements.

### Features

- ✅ **Multi-Provider Support**: Use Gemini (free!) or Anthropic Claude
- ✅ **Structured Output**: Returns valid JSON with typed schema validation
- ✅ **Divergent Thinking**: Generates ideas across technical, service, and behavioral approaches
- ✅ **Type Safety**: Full TypeScript support with Zod schema validation

### Usage

#### As a Module

```typescript
import { generateHMWIdeas } from './agents/hmwAgent';

const result = await generateHMWIdeas(
  'How might we help busy professionals maintain work-life balance?'
);

if (result.success) {
  console.log(result.data.ideas);
  // [
  //   {
  //     title: "Smart Boundary Assistant",
  //     description: "An AI-powered app that...",
  //     approach: "technical"
  //   },
  //   { ... },
  //   { ... }
  // ]
}
```

#### Running Tests

```bash
# Run the test function
npx tsx src/agents/hmwAgent.ts
```

### Output Schema

Each idea contains:

- **title**: Short, catchy name for the solution
- **description**: 2-3 sentences explaining the concept
- **approach**: One of `technical`, `service`, or `behavioral`

### Configuration

Supports both **Gemini (free!)** and **Anthropic** as LLM providers.

In your `.env` file:

```bash
# Choose provider (default: gemini)
LLM_PROVIDER=gemini  # or 'anthropic'

# For Gemini (FREE tier!)
GOOGLE_API_KEY=your_key_here
# Get free key at: https://aistudio.google.com/app/apikey

# For Anthropic (optional)
ANTHROPIC_API_KEY=sk-ant-...
```

### LangChain Components Used

- **ChatAnthropic**: LLM for idea generation
- **PromptTemplate**: Structures the ideation prompt
- **StructuredOutputParser**: Ensures valid JSON output with Zod schema
- **Chain**: Pipes prompt → model → parser

### Prompt Engineering

The agent uses a carefully crafted prompt that:

1. Establishes role as a UX design ideation assistant
2. Instructs for divergent thinking (distinctly different ideas)
3. Requires specific distribution across approach types
4. Provides clear output format expectations

### Testing

The built-in test uses the HMW statement:
> "How might we help busy professionals maintain work-life balance?"

Expected output: 3 creative, varied ideas with valid JSON structure.

### Extending

To create variations:

- Adjust `temperature` for more/less creativity
- Modify prompt template for different ideation styles
- Change output schema for additional fields
- Add filtering or scoring logic
