/// <reference path="../deno.d.ts" />
// Azure OpenAI Client Helper for Supabase Edge Functions

interface AzureChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
}

export async function callAzureOpenAI(
  messages: AzureChatMessage[],
  schemaConfig?: { name: string; schema: Record<string, unknown> }
): Promise<any> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  const endpoint = Deno.env.get('OPENAI_ENDPOINT');
  const apiVersion = Deno.env.get('OPENAI_API_VERSION') || '2024-08-01-preview';
  const deployment = Deno.env.get('OPENAI_LLM') || 'gpt-4o-mini';

  if (!apiKey || !endpoint) {
    throw new Error('Missing OPENAI_API_KEY or OPENAI_ENDPOINT environment variables');
  }

  // Clean endpoint: remove trailing slash and protocol if present
  let cleanEndpoint = endpoint.trim().replace(/\/+$/, '');
  if (!cleanEndpoint.startsWith('https://') && !cleanEndpoint.startsWith('http://')) {
    cleanEndpoint = `https://${cleanEndpoint}`;
  }

  const url = `${cleanEndpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  // Helper to make the HTTP POST
  async function makeRequest(useStructuredOutputs: boolean): Promise<Response> {
    const body: Record<string, unknown> = {
      messages,
      temperature: 0.2,
      max_tokens: 2000,
    };

    if (useStructuredOutputs && schemaConfig) {
      body.response_format = {
        type: 'json_schema',
        json_schema: {
          name: schemaConfig.name,
          strict: true,
          schema: schemaConfig.schema,
        },
      };
    } else {
      body.response_format = { type: 'json_object' };
    }

    return await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(body),
    });
  }

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < 2) {
    attempt++;
    try {
      // First attempt with structured outputs if schema provided
      let response = await makeRequest(true);

      // If structured outputs rejected by deployment (e.g. 400 with unsupported response_format), fallback to json_object
      if (!response.ok && response.status === 400 && schemaConfig) {
        console.warn('Structured outputs rejected by Azure deployment, falling back to json_object mode...');
        response = await makeRequest(false);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Azure OpenAI Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Azure OpenAI returned empty response content');
      }

      return JSON.parse(content);
    } catch (err: any) {
      lastError = err;
      console.error(`Azure OpenAI call failed on attempt ${attempt}:`, err.message);
      if (attempt < 2) {
        // Wait 500ms before retry
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  throw lastError || new Error('Azure OpenAI call failed after 2 attempts');
}
