import { NextRequest, NextResponse } from 'next/server';
import { sendMessageToClaude, ClaudeMessage } from '@/lib/claude';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, model, maxTokens } = body;

    // Validate the request
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Validate message format
    for (const message of messages) {
      if (!message.role || !message.content) {
        return NextResponse.json(
          { error: 'Each message must have role and content' },
          { status: 400 }
        );
      }
      if (!['user', 'assistant'].includes(message.role)) {
        return NextResponse.json(
          { error: 'Message role must be either "user" or "assistant"' },
          { status: 400 }
        );
      }
    }

    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Claude API key not configured' },
        { status: 500 }
      );
    }

    // Send message to Claude
    const response = await sendMessageToClaude(
      messages as ClaudeMessage[],
      model,
      maxTokens
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in Claude API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Claude API endpoint is ready',
    models: [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
    ],
  });
} 