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

    // ======================================================
    // ========= CAMBIO #1: Recogemos el nuevo dato =========
    // ======================================================
    const { keywords, articleTopic, searchIntent, wordCount, language, toneStyle, externalLinks, editingOutline, realtimeKnowledge } = req.body;

    // ========================================================
    // ========= CAMBIO #2: Mejoramos el prompt con el tema =========
    // ========================================================
    let prompt = `Genera un artículo completo y bien estructurado sobre el siguiente tema principal: "${articleTopic}".
Usa las siguientes palabras clave de apoyo de forma natural a lo largo del texto: ${keywords}.`;

    if (editingOutline) {
        prompt += `\nPrimero, proporciona un esquema de edición detallado para el artículo. Luego, escribe el artículo basándote en ese esquema.`;
    }
    
    prompt += `
      El artículo debe cumplir las siguientes condiciones:
      - Intención de búsqueda: ${searchIntent}.
      - Extensión MÁXIMA: ${wordCount} palabras. No excedas esta cantidad.
      - Idioma: ${language}.
      - Tono y estilo: ${toneStyle}.`;
      
    if (externalLinks) {
        prompt += `\n- Incluye sugerencias de enlaces externos relevantes.`;
    }
    
    prompt += `\nEl resultado debe ser coherente, atractivo y formateado en Markdown.`;

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
        temperature: 0.8,
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
