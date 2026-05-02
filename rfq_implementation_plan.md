# Plan de Implementación: Sistema de Cotizaciones B2B (RFQs)

El módulo de **Cotizaciones (RFQs)** es el motor para negocios a medida (fabricación, empaques personalizados, altos volúmenes). A diferencia del Marketplace que es inmediato, el RFQ es un proceso relacional. 

Para asegurar el éxito, estructuraremos el desarrollo con la estrategia **"Divide y Vencerás"** en 6 fases.

---

## Fase 1: La Solicitud del Cliente (Creación del RFQ)
**Objetivo:** Permitir al cliente pedir exactamente lo que necesita con soporte visual.
*   **Frontend Cliente:** Formulario de "Nueva Cotización". Incluirá: Título, Especificaciones técnicas, Cantidad (MOQ deseado), Unidad, y un **sistema para adjuntar imágenes/planos de referencia** (clave para que el proveedor entienda qué fabricará).
*   **Backend:** Actualización del esquema para soportar imágenes en los RFQs. Sistema de notificaciones que hace *broadcasting* (aviso masivo) a todos los proveedores de la categoría relacionada.

## Fase 2: Oportunidades y Respuesta del Proveedor
**Objetivo:** Que los proveedores compitan por el contrato enviando sus propuestas.
*   **Frontend Proveedor:** Nueva pestaña llamada "Oportunidades de Negocio". Aquí ven los RFQs públicos. Si pueden fabricarlo, llenan un formulario de **Propuesta Comercial**: Precio Unitario, Tiempo de Producción, Días de entrega, y Términos.
*   **Backend:** Endpoint para que el proveedor registre su cotización (`RFQQuote`). **Regla de negocio:** Un proveedor no puede ver los precios que ofrecen sus competidores.

## Fase 3: Evaluación y Selección (El Tablero de Decisión)
**Objetivo:** Ayudar al cliente a tomar la mejor decisión basada en datos, no solo en precio.
*   **Frontend Cliente:** Al entrar a su RFQ, verá un tablero comparativo con las ofertas recibidas. Las tarjetas de los proveedores mostrarán:
    *   Precio total y unitario.
    *   Tiempos de entrega.
    *   **Métricas de Confianza:** Rating del proveedor en Marketplace (estrellas) y **Rating en Cotizaciones Previas** (estrellas separadas), para saber qué tan bueno es fabricando bajo pedido.
*   **Acción:** Botón "Aceptar Propuesta". Al hacerlo, el sistema cambia el estado del RFQ y notifica al proveedor ganador (y amablemente cierra las demás propuestas).

## Fase 4: Negociación Segura (Chat B2B Integrado)
**Objetivo:** Mantener la comunicación dentro de la plataforma para proteger a ambas partes (y la comisión de la plataforma).
*   **Frontend (Ambos):** Tras la aceptación, se genera una "Sala de Negociación". Un chat en tiempo real donde pueden discutir tolerancias, colores exactos o ajustes logísticos.
*   **Rol del Admin:** El administrador actúa como **Auditor Silencioso**. El backend alerta al admin si el algoritmo detecta palabras como "WhatsApp", "celular" o "@gmail", protegiendo a la plataforma de evasión de comisiones. El admin puede intervenir en el chat si hay disputas.

## Fase 5: El Flujo de Producción (Muestras y Escalamiento)
**Objetivo:** Mitigar riesgos mediante un flujo de aprobación por etapas.
*   **Frontend (Ambos):** El pedido (Order) se regirá por un *Stepper* (línea de tiempo visual):
    1.  **Fase de Muestra:** El proveedor fabrica una muestra. El cliente aprueba la muestra (con foto o envío físico).
    2.  **Depósito Inicial:** El cliente realiza el pago del enganche (ej. 50%).
    3.  **Producción en Masa:** El proveedor reporta avances.
    4.  **Control de Calidad y Liquidación:** Pago del 50% restante al confirmar calidad.
    5.  **Despacho y Entrega.**

## Fase 6: Cierre, Calificación y Analíticas
**Objetivo:** Alimentar el algoritmo de reputación e incentivar a los buenos proveedores.
*   **Frontend Cliente:** Tras la entrega, pantalla de calificación obligatoria enfocada en el servicio del RFQ.
*   **Backend:** Actualiza automáticamente el `rfqRating` del proveedor.
*   **Frontend Proveedor:** Su Dashboard refleja el ingreso ganado, mejora su nivel en el ranking de proveedores, y recibe una insignia de "Fábrica Confiable" si mantiene un puntaje alto en RFQs.

---

### ¿Cómo trabajaremos esto? (Plan de Acción)
No programaremos todo de golpe. Avanzaremos en este orden:

1.  **Iteración 1:** Formularios de creación de RFQ (Fase 1 y 2). Conectar Cliente → Proveedor.
2.  **Iteración 2:** Comparador de ofertas y aceptación (Fase 3).
3.  **Iteración 3:** Integración del Chat B2B y Auditoría Admin (Fase 4).
4.  **Iteración 4:** Flujo del Pedido con Muestras y Calificación final (Fases 5 y 6).

¿Estás de acuerdo con este enfoque? Si es así, podemos comenzar directamente programando la **Iteración 1 (Formulario de cliente con subida de imágenes y el tablero de recepción del proveedor)**.
