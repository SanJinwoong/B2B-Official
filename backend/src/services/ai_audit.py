import sys
import json
import urllib.request
import urllib.error

def audit_message(content):
    # Configuración de Ollama
    OLLAMA_URL = "http://localhost:11434/api/generate"
    MODEL = "llama3"

    system_prompt = (
        "Eres un auditor de seguridad experto para una plataforma B2B. "
        "Tu tarea es detectar intentos de EVASIÓN DE COMISIÓN. "
        "Esto ocurre cuando los usuarios intercambian datos de contacto (WhatsApp, teléfono, email, redes sociales) "
        "o proponen pagos fuera de la plataforma. "
        "Responde EXCLUSIVAMENTE en formato JSON válido con esta estructura: "
        '{"is_evasion": boolean, "score": float (0-1), "reason": "breve explicación en español"}. '
        "No incluyas explicaciones adicionales fuera del JSON."
    )

    prompt = f"Analiza este mensaje: '{content}'"
    
    data = json.dumps({
        "model": MODEL,
        "prompt": f"{system_prompt}\n\n{prompt}",
        "stream": False,
        "format": "json"
    }).encode('utf-8')

    try:
        headers = {'Content-Type': 'application/json'}
        req = urllib.request.Request(OLLAMA_URL, data=data, headers=headers)
        # Timeout aumentado a 90 segundos porque Llama3 puede ser lento en CPU
        with urllib.request.urlopen(req, timeout=90) as response:
            result = json.loads(response.read().decode('utf-8'))
            raw_response = result.get('response', '{}')
            return json.loads(raw_response)
            
    except urllib.error.URLError as e:
        return {
            "is_evasion": False,
            "score": 0.0,
            "reason": f"No se pudo conectar con Ollama. Asegúrate de que esté abierto. Error: {str(e)}"
        }
    except Exception as e:
        return {
            "is_evasion": False,
            "score": 0.0,
            "reason": f"Error en la auditoría: {str(e)}"
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No content provided"}))
        sys.exit(1)

    message_content = sys.argv[1]
    audit_result = audit_message(message_content)
    print(json.dumps(audit_result))
