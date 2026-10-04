import { GoogleGenAI } from '@google/genai';

export interface LocationAnalysisRequest {
  lat: number;
  lng: number;
  address?: string;
  batteryLevel?: number | null;
  isEmergency?: boolean;
  status?: string;
  phoneNumber?: string;
}

export interface AISafetyReportResponse {
  summary: string;
  safetyScore: number;
  nearestServicesAdvice: string;
  emergencyChecklist: string[];
  batteryStrategy: string;
  timestamp: string;
  modelUsed?: string;
  isServiceUnavailable?: boolean;
  notice?: string;
}

const PRIMARY_MODEL = 'gemini-3.8-flash';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite';
const MAX_PRIMARY_RETRIES = 3;
const MAX_FALLBACK_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 6000;

// In-flight request deduplication map to prevent repeated concurrent calls
const inFlightRequests = new Map<string, Promise<AISafetyReportResponse>>();

/**
 * Determine if an error is temporary and eligible for retry (503, 429, eligible 5xx)
 */
function isRetryableError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const status = (error as { status?: number })?.status;

  if (status === 503 || status === 429 || status === 500 || status === 502 || status === 504) {
    return true;
  }

  return (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('ResourceExhausted') ||
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes('timeout') ||
    msg.includes('fetch failed')
  );
}

/**
 * Exponential backoff with randomized jitter
 */
async function waitWithJitter(attempt: number): Promise<void> {
  const exponentialDelay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 800;
  const delay = Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY_MS);
  await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Generate safety analysis from Gemini using a specific model with retry logic
 */
async function callGeminiWithRetries(
  ai: GoogleGenAI,
  modelName: string,
  prompt: string,
  maxRetries: number
): Promise<{ text: string; modelUsed: string }> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[Gemini API] Retry attempt ${attempt + 1}/${maxRetries} on model ${modelName}...`);
        await waitWithJitter(attempt - 1);
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        }
      });

      const text = response.text?.trim();
      if (!text) {
        throw new Error('Gemini returned an empty response.');
      }

      return { text, modelUsed: modelName };
    } catch (err: unknown) {
      lastError = err;
      const isRetryable = isRetryableError(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[Gemini API] Error on attempt ${attempt + 1} (${modelName}): ${errMsg}. Retryable: ${isRetryable}`);

      if (!isRetryable) {
        // Non-retryable error (e.g. invalid arguments or authentication failure)
        throw err;
      }
    }
  }

  throw lastError;
}

export async function analyzeLocationWithGemini(data: LocationAnalysisRequest): Promise<AISafetyReportResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  // Local fallback baseline if API key is not present
  if (!apiKey) {
    console.info('[Gemini API] No GEMINI_API_KEY detected. Returning offline safety assessment.');
    return buildBaselineReport(data, 'Offline baseline mode (API key not configured).');
  }

  // Deduplication key based on coordinates rounded to 4 decimals (~11 meters)
  const reqKey = `${data.lat.toFixed(4)}_${data.lng.toFixed(4)}_${data.isEmergency ? 'sos' : 'normal'}`;
  const existingPromise = inFlightRequests.get(reqKey);
  if (existingPromise) {
    console.log('[Gemini API] Re-using in-flight request for coordinates:', reqKey);
    return existingPromise;
  }

  const analysisPromise = (async (): Promise<AISafetyReportResponse> => {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `You are an expert AI Mobile Safety & Geolocation Incident Analyst for BeaconPath.
Analyze the following verified device telemetry and provide safety recommendations:
- Latitude: ${data.lat}
- Longitude: ${data.lng}
- Address: ${data.address || 'GPS coordinates verified'}
- Device Battery: ${data.batteryLevel !== null && data.batteryLevel !== undefined ? `${data.batteryLevel}%` : 'Unknown'}
- Distress / Emergency SOS: ${data.isEmergency ? 'ACTIVE SOS EMERGENCY BEACON TRIGGERED!' : 'Normal active tracking'}
- Device Phone: ${data.phoneNumber || 'Protected'}

Output a single valid JSON object with EXACTLY this structure (no markdown fences):
{
  "summary": "1-2 sentence assessment of physical safety profile and coordinates",
  "safetyScore": 88,
  "nearestServicesAdvice": "Guidance on locating nearby safety hubs, police, hospitals, or well-lit corridors",
  "emergencyChecklist": [
    "Practical safety action 1",
    "Practical safety action 2",
    "Practical safety action 3"
  ],
  "batteryStrategy": "Power preservation advice tailored to battery level",
  "timestamp": "${new Date().toISOString()}"
}`;

    // Step 1: Attempt primary model with retries
    try {
      const { text, modelUsed } = await callGeminiWithRetries(ai, PRIMARY_MODEL, prompt, MAX_PRIMARY_RETRIES);
      const parsed = JSON.parse(text);
      return {
        ...parsed,
        modelUsed,
        isServiceUnavailable: false,
      };
    } catch (primaryErr: unknown) {
      console.warn(`[Gemini API] Primary model ${PRIMARY_MODEL} exhausted retries. Attempting fallback model ${FALLBACK_MODEL}...`, primaryErr);

      // Step 2: Attempt fallback model with retries
      try {
        const { text, modelUsed } = await callGeminiWithRetries(ai, FALLBACK_MODEL, prompt, MAX_FALLBACK_RETRIES);
        const parsed = JSON.parse(text);
        return {
          ...parsed,
          modelUsed: `${modelUsed} (High-demand fallback)`,
          isServiceUnavailable: false,
        };
      } catch (fallbackErr: unknown) {
        console.error('[Gemini API] Both primary and fallback models unavailable due to high demand/network:', fallbackErr);

        // Step 3: Return a transparent, non-blocking baseline safety report
        return buildBaselineReport(
          data,
          'Gemini AI models are temporarily experiencing high demand. Live GPS tracking remains active and unaffected.'
        );
      }
    }
  })();

  inFlightRequests.set(reqKey, analysisPromise);

  try {
    return await analysisPromise;
  } finally {
    // Keep in-flight cache brief (5 seconds) to allow fresh updates
    setTimeout(() => {
      inFlightRequests.delete(reqKey);
    }, 5000);
  }
}

function buildBaselineReport(data: LocationAnalysisRequest, notice: string): AISafetyReportResponse {
  return {
    summary: `Verified GPS fix at ${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}${data.address ? ` near ${data.address}` : ''}.`,
    safetyScore: data.isEmergency ? 30 : 88,
    nearestServicesAdvice: 'Stay in well-lit, populated public areas. In urgent emergencies dial local emergency dispatch (e.g. 911 / 112).',
    emergencyChecklist: [
      'Keep your live tracking link shared with a trusted contact.',
      'Monitor device battery and enable low-power mode if traveling.',
      'If in immediate danger, use the SOS Emergency button to broadcast alerts.'
    ],
    batteryStrategy: data.batteryLevel && data.batteryLevel < 25
      ? 'Battery is below 25%. Enable Power Saving Mode immediately.'
      : 'Battery level is sufficient for continuous GPS telemetry.',
    timestamp: new Date().toISOString(),
    modelUsed: 'Safety Rules Engine (Gemini High Demand Baseline)',
    isServiceUnavailable: true,
    notice
  };
}
