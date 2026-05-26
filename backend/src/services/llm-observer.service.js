/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  LLM OBSERVER — Observador de Fuga de Ingresos basado en IA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Analiza mensajes del chat B2B usando Google Gemini para detectar intentos
 *  de evasión de la intermediación comercial (fuga de ingresos).
 *
 *  A diferencia de una búsqueda por palabras clave, el LLM entiende la
 *  INTENCIÓN SEMÁNTICA del mensaje — detecta lenguaje indirecto, eufemismos
 *  y variaciones creativas que una regex jamás capturaría.
 *
 *  Fallback: si la API de Gemini falla o no está configurada, se usa un
 *  detector basado en regex como respaldo.
 *
 *  @module llm-observer.service
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Configuración ────────────────────────────────────────────────────────────

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.0-flash'; // Rápido, económico, ideal para análisis de texto corto

let genAI = null;
let model = null;

if (GEMINI_API_KEY && GEMINI_API_KEY !== 'tu-api-key-aqui') {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: MODEL_NAME });
  console.log(`[LLM Observer] ✅ Conectado a Google Gemini (${MODEL_NAME})`);
} else {
  console.log('[LLM Observer] ⚠️  GEMINI_API_KEY no configurada — usando fallback regex');
}

// ── Prompt del sistema ───────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres un sistema de análisis de seguridad para una plataforma B2B de intermediación comercial. Tu trabajo es analizar mensajes del chat entre clientes y proveedores para detectar intentos de EVASIÓN DE LA INTERMEDIACIÓN.

La evasión ocurre cuando un usuario intenta:
1. Contactar a la otra parte FUERA de la plataforma (WhatsApp, email personal, teléfono, redes sociales)
2. Realizar pagos FUERA de la plataforma (transferencia directa, efectivo, depósito bancario)
3. Acordar precios o condiciones que excluyan la comisión de la plataforma
4. Compartir información de contacto personal para evadir la intermediación
5. Usar lenguaje indirecto o eufemismos para sugerir cualquiera de los puntos anteriores

IMPORTANTE:
- Mensajes normales de negociación B2B (preguntar precios, tiempos de entrega, especificaciones) NO son evasión.
- Preguntas sobre el proceso de la plataforma NO son evasión.
- Solo marca como evasión si hay una INTENCIÓN clara de salir de la plataforma.

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{"isEvasion": true/false, "confidence": 0.0-1.0, "reason": "explicación breve en español"}`;

// ── Regex fallback (respaldo si la API falla) ────────────────────────────────

const FALLBACK_REGEX = /whatsapp|whats|wasap|wp|wpp|celular|cel|telefono|teléfono|numero|número|llamame|llámame|contactame|contáctame|pasame|pásame|\@gmail|\@yahoo|\@hotmail|\@outlook|email|correo|facebook|instagram|ig|fb|telegram|linkedin|twitter|skype|por fuera|sin comisi[oó]n|dep[oó]sito directo|cuenta bancaria|transferencia|clabe|tarjeta|efectivo/i;

/**
 * Analiza un mensaje usando el LLM para detectar intención de evasión.
 * Si la API falla, usa regex como fallback.
 *
 * @param {string} content  — Contenido del mensaje a analizar
 * @returns {Promise<{isEvasion: boolean, confidence: number, reason: string, method: string}>}
 */
const analyzeMessage = async (content) => {
  // Si no hay API key, usar fallback directamente
  if (!model) {
    return fallbackAnalysis(content);
  }

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${SYSTEM_PROMPT}\n\nMensaje a analizar:\n"${content}"` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,       // Baja temperatura para respuestas consistentes
        maxOutputTokens: 200,   // Respuesta corta (solo JSON)
        responseMimeType: 'application/json',
      },
    });

    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);

    return {
      isEvasion:  Boolean(parsed.isEvasion),
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
      reason:     String(parsed.reason || 'Sin razón especificada'),
      method:     'LLM'   // Indica que fue analizado por IA
    };

  } catch (error) {
    console.error('[LLM Observer] Error en análisis LLM, usando fallback:', error.message);
    return fallbackAnalysis(content);
  }
};

/**
 * Análisis de respaldo usando regex (cuando la API no está disponible).
 *
 * @param {string} content
 * @returns {{isEvasion: boolean, confidence: number, reason: string, method: string}}
 */
const fallbackAnalysis = (content) => {
  const isEvasion = FALLBACK_REGEX.test(content);
  
  // Encontrar qué palabra activó la alerta
  let matchedWord = '';
  if (isEvasion) {
    const match = content.match(FALLBACK_REGEX);
    matchedWord = match ? match[0] : '';
  }

  return {
    isEvasion,
    confidence: isEvasion ? 0.7 : 0.0,  // La regex no da confianza granular
    reason: isEvasion
      ? `Palabra clave detectada: "${matchedWord}" (análisis por regex — API no disponible)`
      : '',
    method: 'REGEX'  // Indica que fue analizado por fallback
  };
};

module.exports = {
  analyzeMessage,
};
