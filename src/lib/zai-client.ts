/**
 * Lightweight Z.AI API client (bypasses SDK to avoid .z-ai-config file requirement).
 * SDK requires a JSON config file at runtime which doesn't work on Vercel.
 * We call the API directly with fetch using Z_AI_API_KEY env var.
 */

const ZAI_BASE_URL = 'https://api.z.ai/api/paas/v4';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResponse {
  choices: Array<{
    message?: { content: string };
    delta?: { content: string };
  }>;
  // Capture other fields
  [key: string]: any;
}

/**
 * Create a chat completion via Z.AI API.
 * Uses Z_AI_API_KEY env var.
 */
export async function createChatCompletion(
  messages: ChatMessage[],
  options: { stream?: boolean; maxDuration?: number } = {}
): Promise<ChatCompletionResponse> {
  if (!process.env.Z_AI_API_KEY) {
    throw new Error('Z_AI_API_KEY environment variable is not set');
  }

  const url = `${ZAI_BASE_URL}/chat/completions`;
  const body: any = {
    messages,
    stream: false,
    thinking: { type: 'disabled' },
    ...options,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.Z_AI_API_KEY}`,
      'X-Z-AI-From': 'Z',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Z.AI API error ${response.status}: ${errorText.slice(0, 300)}`);
  }

  return await response.json() as ChatCompletionResponse;
}
