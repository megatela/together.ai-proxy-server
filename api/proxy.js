export default async function handler(req, res) {
  // Configuración de CORS
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Title, HTTP-Referer');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.OPENROUTER_API_KEY; 
    if (!apiKey) {
      throw new Error("La clave API de OpenRouter no está configurada en el servidor.");
    }

    const { keywords, articleTopic, searchIntent, wordCount, language, toneStyle, externalLinks, editingOutline, realtimeKnowledge } = req.body;

    // =========================================================================
    // ========= INICIO DE LA MODIFICACIÓN: NUEVO PROMPT ESTRUCTURADO =========
    // =========================================================================

    // Creamos una estructura de "mensajes" con roles de sistema y usuario
    const messages = [
        {
            role: 'system',
            content: 'Eres un experto redactor de artículos SEO multilingüe. Tu misión es escribir artículos de alta calidad siguiendo las instrucciones del usuario al pie de la letra. La instrucción más importante es siempre el TEMA PRINCIPAL.'
        },
        {
            role: 'user',
            content: `Por favor, escribe un artículo siguiendo estas especificaciones exactas:

### ORDEN DE TRABAJO ###

- **TEMA PRINCIPAL (Instrucción prioritaria):** ${articleTopic}
- **Palabras Clave de Apoyo:** ${keywords}
- **Intención de Búsqueda:** ${searchIntent}
- **Longitud Máxima:** ${wordCount} palabras
- **Idioma:** ${language}
- **Tono y Estilo:** ${toneStyle}
- **Incluir Enlaces Externos:** ${externalLinks ? 'Sí' : 'No'}
- **Incluir Esquema de Edición:** ${editingOutline ? 'Sí' : 'No'}
- **Usar Conocimiento Actualizado:** ${realtimeKnowledge ? 'Sí' : 'No'}

**REGLA DE FORMATO CRÍTICA:** Formatea la respuesta completa usando Markdown (usa '#', '##', '###' para títulos y subtítulos, '**' para negritas, y '*' para listas).`
        }
    ];

    // =======================================================================
    // ========= FIN DE LA MODIFICACIÓN: NUEVO PROMPT ESTRUCTURADO =========
    // =======================================================================

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://www.techebooks.online/', // Tu URL aquí
        'X-Title': 'Generador de Articulos IA' 
      },
      body: JSON.stringify({
        // ============================================================
        // ========= CAMBIO #2: NUEVO MODELO DE IA (LLAMA 3) =========
        // ============================================================
        model: 'meta-llama/Llama-3-8B-Instruct-hf',
        messages: messages, // Usamos la nueva estructura de mensajes
        max_tokens: 2000,
        temperature: 0.7,
        top_p: 0.8,
      }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error de la API de OpenRouter: ${errorData.error ? errorData.error.message : response.statusText}`);
    }

    const result = await response.json();
    const text = result.choices[0].message.content;

    res.status(200).json({ articleContent: text });

  } catch (error) {
    console.error('Error en el proxy:', error);
    res.status(500).json({ error: 'Ocurrió un error al contactar con la IA.' });
  }
}
