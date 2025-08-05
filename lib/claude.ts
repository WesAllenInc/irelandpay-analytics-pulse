import Anthropic from '@anthropic-ai/sdk';

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // Make sure to add this to your .env file
});

// Default model to use
const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Send a message to Claude and get a response
 */
export async function sendMessageToClaude(
  messages: ClaudeMessage[],
  model: string = DEFAULT_MODEL,
  maxTokens: number = 4096
): Promise<ClaudeResponse> {
  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    return {
      content: response.content[0]?.text || '',
      usage: {
        input_tokens: response.usage?.input_tokens || 0,
        output_tokens: response.usage?.output_tokens || 0,
      },
    };
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw new Error('Failed to get response from Claude');
  }
}

/**
 * Send a single user message and get a response
 */
export async function askClaude(
  userMessage: string,
  systemPrompt?: string,
  model: string = DEFAULT_MODEL
): Promise<ClaudeResponse> {
  const messages: ClaudeMessage[] = [];
  
  if (systemPrompt) {
    messages.push({
      role: 'user',
      content: `System: ${systemPrompt}\n\nUser: ${userMessage}`,
    });
  } else {
    messages.push({
      role: 'user',
      content: userMessage,
    });
  }

  return sendMessageToClaude(messages, model);
}

/**
 * Create a conversation with Claude
 */
export class ClaudeConversation {
  private messages: ClaudeMessage[] = [];
  private model: string;

  constructor(model: string = DEFAULT_MODEL) {
    this.model = model;
  }

  /**
   * Add a user message to the conversation
   */
  addUserMessage(content: string): void {
    this.messages.push({ role: 'user', content });
  }

  /**
   * Add an assistant message to the conversation
   */
  addAssistantMessage(content: string): void {
    this.messages.push({ role: 'assistant', content });
  }

  /**
   * Send the current conversation to Claude and get a response
   */
  async send(): Promise<ClaudeResponse> {
    const response = await sendMessageToClaude(this.messages, this.model);
    this.addAssistantMessage(response.content);
    return response;
  }

  /**
   * Get the current conversation history
   */
  getMessages(): ClaudeMessage[] {
    return [...this.messages];
  }

  /**
   * Clear the conversation history
   */
  clear(): void {
    this.messages = [];
  }
}

export default anthropic; 