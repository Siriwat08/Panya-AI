/**
 * Lightweight Z.AI API client (bypasses SDK to avoid .z-ai-config file requirement).
 * Calls API directly with fetch using Z_AI_API_KEY env var.
 */

const ZAI_BASE_URL = 'https://api.z.ai/api/paas/v4';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Create a chat completion via Z.AI API.
 * Returns { content, raw } — content is extracted from multiple possible response shapes.
 */
export async function createChatCompletion(
  messages: ChatMessage[],
  options: { stream?: boolean; model?: string } = {}
): Promise<{ content: string; raw: any }> {
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

  const raw: any = await response.json();

  // Try multiple response shapes
  let content: string | null = null;
  try {
    content =
      raw?.choices?.[0]?.message?.content ??
      raw?.choices?.[0]?.delta?.content ??
      raw?.content ??
      raw?.result?.content ??
      raw?.choices?.[0]?.text ??
      null;
  } catch (e) {
    // ignore
  }

  if (!content) {
    console.error('[zai-client] Unexpected response shape:', JSON.stringify(raw).slice(0, 500));
  }

  return { content: content || '', raw };
}
