// Small reusable contract fixtures for tests and documentation examples.
export const idea = {
  title: 'Budget buddy', approach: 'mobile' as const,
  rationale: 'Make the first budget feel manageable.',
  makePrompt: 'Create a mobile budget wizard with a monthly income input and a Continue button.',
  screens: [{ name: 'Start', platform: 'mobile' as const, root: { type: 'text', text: 'Your first budget' } }],
};
export const spec = { hmw: 'How might we help first-time users set up a budget?', ideas: [idea] };
