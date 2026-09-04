import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  callGeminiAPI,
  getGeminiApiKey,
  saveGeminiApiKey,
  hasGeminiApiKey
} from '../utils/gemini';

describe('Gemini API Integration & Network Resilience', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('manages Gemini API key in localStorage safely', () => {
    saveGeminiApiKey('test-key-12345');
    expect(getGeminiApiKey()).toBe('test-key-12345');
    expect(hasGeminiApiKey()).toBe(true);

    saveGeminiApiKey('');
    // Falls back to embedded key if local key removed
    expect(hasGeminiApiKey()).toBe(true);
  });

  it('successfully returns text on 200 OK with candidate response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'תשובת בינה מלאכותית מפורטת' }]
            }
          }
        ]
      })
    });

    const reply = await callGeminiAPI('בדיקת שאלה פיננסית');
    expect(reply).toBe('תשובת בינה מלאכותית מפורטת');
    expect(global.fetch).toHaveBeenCalled();
  });

  it('filters out thought parts when model returns reasoning chunks', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                { thought: true, text: 'חשיבה פנימית...' },
                { text: 'תשובה סופית בלבד' }
              ]
            }
          }
        ]
      })
    });

    const reply = await callGeminiAPI('בדיקה');
    expect(reply).toBe('תשובה סופית בלבד');
  });

  it('throws friendly Hebrew error on 400 Bad Request or 403 Forbidden without endless retries', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({
        error: { message: 'API key not valid. Please pass a valid API key.' }
      })
    });

    await expect(callGeminiAPI('בדיקה')).rejects.toThrow(/שגיאת Gemini API \(400 Bad Request\)/i);
  });

  it('handles 429 Quota Exceeded by attempting fallback models', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        // First model fails with 429
        return Promise.resolve({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          json: async () => ({ error: { message: 'Quota exceeded' } })
        });
      }
      // Fallback model succeeds
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'תשובה ממודל חלופי' }] } }]
        })
      });
    });

    const reply = await callGeminiAPI('בדיקה');
    expect(reply).toBe('תשובה ממודל חלופי');
    expect(callCount).toBeGreaterThan(1);
  });

  it('handles complete network disconnection cleanly', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network disconnected'));

    await expect(callGeminiAPI('בדיקה')).rejects.toThrow(/שגיאת תקשורת רשת|שגיאה בתקשורת/);
  });
});
