import { config } from "../config/env.js";

const REQUEST_TIMEOUT_MS = 120_000; // 2 min, generous for CPU-only 3b
const MAX_RETRIES = 2;

export interface OllamaResult {
  raw: string;
  success: boolean;
  error?: string;
}

async function callOllamaOnce(prompt: string): Promise<OllamaResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${config.ollama.url}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.ollama.model,
        prompt,
        stream: false,
        format: "json",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { raw: "", success: false, error: `Ollama HTTP ${response.status}` };
    }

    const data = (await response.json()) as { response: string };
    return { raw: data.response, success: true };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      return { raw: "", success: false, error: "Ollama request timed out" };
    }
    return { raw: "", success: false, error: err.message ?? "Unknown Ollama error" };
  }
}

import { ollamaQueue } from "./ollamaQueue.js";

async function callOllamaWithRetry(prompt: string): Promise<OllamaResult> {
  let lastError = "Unknown error";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const result = await callOllamaOnce(prompt);
    if (result.success) return result;
    lastError = result.error ?? lastError;
  }
  return { raw: "", success: false, error: `Failed after ${MAX_RETRIES + 1} attempts: ${lastError}` };
}

export async function callOllama(prompt: string): Promise<OllamaResult> {
  return ollamaQueue.run(() => callOllamaWithRetry(prompt));
}

export async function streamOllama(
  prompt: string,
  onToken: (token: string) => void
): Promise<OllamaResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${config.ollama.url}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.ollama.model,
        prompt,
        stream: true,
        format: "json",
      }),
      signal: controller.signal,
    });

    if (!response.ok || !response.body) {
      clearTimeout(timeoutId);
      return { raw: "", success: false, error: `Ollama HTTP ${response.status}` };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? ""; // keep incomplete last line for next chunk

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (typeof parsed.response === "string") {
            fullText += parsed.response;
            onToken(parsed.response);
          }
        } catch {
          // skip malformed line, keep streaming
        }
      }
    }

    clearTimeout(timeoutId);
    return { raw: fullText, success: true };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      return { raw: "", success: false, error: "Ollama request timed out" };
    }
    return { raw: "", success: false, error: err.message ?? "Unknown Ollama error" };
  }
}

async function callOllamaOnceText(prompt: string): Promise<OllamaResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${config.ollama.url}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.ollama.model,
        prompt,
        stream: false,
        // no format: "json" here — plain text output
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { raw: "", success: false, error: `Ollama HTTP ${response.status}` };
    }

    const data = (await response.json()) as { response: string };
    return { raw: data.response, success: true };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      return { raw: "", success: false, error: "Ollama request timed out" };
    }
    return { raw: "", success: false, error: err.message ?? "Unknown Ollama error" };
  }
}

export async function callOllamaText(prompt: string): Promise<OllamaResult> {
  return ollamaQueue.run(() => callOllamaOnceText(prompt));
}