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
    // ========= INICIO DE LA MODIFICACIÓN: PROMPT MÁS ESTRICTO Y DIRECTO =========
    // =========================================================================

    let prompt = `Tu tarea principal y única es escribir un artículo de alta calidad.

LA INSTRUCCIÓN MÁS IMPORTANTE E INNEGOCIABLE ES EL TEMA. IGNORA CUALQUIER OTRA COSA SI ENTRA EN CONFLICTO CON ESTO.
EL TEMA PRINCIPAL DEL ARTÍCULO ES: "${articleTopic}"

Ahora, debes escribir el artículo siguiendo ESTRICTAMENTE las siguientes reglas secundarias:

1.  **PALABRAS CLAVE DE APOYO:** Integra de forma natural las siguientes palabras clave a lo largo del texto: ${keywords}.
2.  **INTENCIÓN:** La intención de búsqueda es ${searchIntent}.
3.  **LONGITUD:** La extensión MÁXIMA es de ${wordCount} palabras. NO excedas esta cantidad.
4.  **IDIOMA:** El artículo debe estar escrito en ${language}.
5.  **TONO:** El tono y estilo debe ser ${toneStyle}.
6.  **FORMATO:** El resultado debe ser texto plano. NO USES FORMATO MARKDOWN. No incluyas ningún carácter como '#', '**', o '-' para listas. Usa solo saltos de línea para separar párrafos.
`;

    if (editingOutline) {
        prompt += `7. **ESQUEMA:** Primero, proporciona un esquema de edición detallado para el artículo. Luego, escribe el artículo completo basándote en ese esquema.\n`;
    }
    
    if (externalLinks) {
        prompt += `8. **ENLACES:** Incluye sugerencias de enlaces externos relevantes.\n`;
    }

    // =======================================================================
    // ========= FIN DE LA MODIFICACIÓN: PROMPT MÁS ESTRICTO Y DIRECTO =========
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
        model: 'deepseek/deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.7, // Bajamos un poco la temperatura para que sea menos "creativo" y más obediente
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
