/**
 * Lightweight Z.AI API client (bypasses SDK to avoid .z-ai-config file requirement).
 */

const ZAI_BASE_URL = 'https://api.z.ai/api/paas/v4';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function createChatCompletion(
  messages: ChatMessage[],
  options: { stream?: boolean; model?: string } = {}
): Promise<{ content: string; raw: any }> {
  if (!process.env.Z_AI_API_KEY) {
    throw new Error('Z_AI_API_KEY environment variable is not set');
  }

  const url = `${ZAI_BASE_URL}/chat/completions`;
  // Default model — glm-4-flash (free tier)
  // Can override via Z_AI_MODEL env var
  const model = options.model || process.env.Z_AI_MODEL || 'glm-4-flash';

  const body: any = {
    model,
    messages,
    stream: false,
    ...options,
  };

  console.log('[zai-client] Calling Z.AI with model:', model, 'messages:', messages.length);

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
    throw new Error(`Z.AI API HTTP ${response.status}: ${errorText.slice(0, 500)}`);
  }

  const raw: any = await response.json();

  if (raw?.error) {
    const errMsg = typeof raw.error === 'string' ? raw.error : (raw.error.message || JSON.stringify(raw.error));
    throw new Error(`Z.AI API body error: ${errMsg.slice(0, 300)}`);
  }

  let content: string | null = null;
  try {
    content =
      raw?.choices?.[0]?.message?.content ??
      raw?.choices?.[0]?.delta?.content ??
      raw?.content ??
      raw?.result?.content ??
      raw?.choices?.[0]?.text ??
      null;
  } catch (e) {}

  if (!content) {
    console.error('[zai-client] Unexpected response:', JSON.stringify(raw).slice(0, 500));
  }

  return { content: content || '', raw };
}
