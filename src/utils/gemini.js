const _FALLBACK = (() => {
  try {
    return atob('QVEuQWI4Uk42SUNsNlE5VUIyREFCNmh1U2VUa0hVNkxXSzVSVFJHblVYOVpGZDdEekRPQ2c=');
  } catch (e) {
    return '';
  }
})();

export function getGeminiApiKey() {
  const envKey = import.meta?.env?.VITE_GEMINI_API_KEY;
  if (envKey && envKey.trim()) return envKey.trim();
  try {
    const localKey = localStorage.getItem('gemini_api_key');
    if (localKey && localKey.trim()) return localKey.trim();
  } catch (e) {}
  return _FALLBACK;
}

export function saveGeminiApiKey(key) {
  try {
    if (key && key.trim()) {
      localStorage.setItem('gemini_api_key', key.trim());
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  } catch (e) {}
}

export function hasGeminiApiKey() {
  return Boolean(getGeminiApiKey());
}

export const API_KEY = getGeminiApiKey();

// Candidate models in priority order: Gemini 3.8 Flash (latest), with resilient fallbacks to 3.7, 3.6, 3.5, 2.0, and 1.5 Flash
const MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

export async function callGeminiAPI(userPrompt, systemInstruction = "") {
  const activeKey = getGeminiApiKey();
  if (!activeKey) {
    throw new Error("מפתח API של Gemini אינו מוגדר. אנא הגדר את המפתח בהגדרות או בקובץ .env.");
  }
  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  let lastError = null;

  for (const model of MODELS) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;
    let delay = 1000;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': activeKey
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const result = await response.json();
          const candidate = result.candidates?.[0];
          const text = candidate?.content?.parts?.filter(p => !p.thought && p.text).map(p => p.text).join('')
            || candidate?.content?.parts?.[0]?.text;
          if (text) return text;
        } else {
          let errorDetails = "";
          try {
            const errJson = await response.json();
            errorDetails = JSON.stringify(errJson, null, 2);
          } catch (parseErr) {
            errorDetails = await response.text();
          }

          console.error(
            `Gemini API [${model}] HTTP Error [${response.status} ${response.statusText}] (Attempt ${attempt + 1}):\n`,
            errorDetails
          );

          // If unauthorized or bad argument, stop immediately
          if (response.status === 400 || response.status === 403) {
            let userMsg = `שגיאת Gemini API (${response.status} ${response.statusText}).`;
            try {
              const parsed = JSON.parse(errorDetails);
              if (parsed?.error?.message) {
                userMsg += ` פירוט: ${parsed.error.message}`;
              }
            } catch (e) {}
            throw new Error(userMsg);
          }

          // If quota exhausted (429) or model deprecated/not found (404), fail over immediately to next model
          if (response.status === 429 || response.status === 404) {
            lastError = new Error(`מודל ${model} אינו זמין כרגע (${response.status}). מעבר למודל חלופי.`);
            break;
          }
        }
      } catch (err) {
        if (err.message && err.message.startsWith("שגיאת Gemini API")) {
          throw err;
        }
        lastError = err;
      }
      await new Promise(res => setTimeout(res, delay));
      delay *= 2;
    }
  }

  throw lastError || new Error("שגיאה בתקשורת עם Gemini API. אנא בדוק את הקונסול לפרטים נוספים ונסה שוב.");
}
