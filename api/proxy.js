export default async function handler(req, res) {
  // Configuración de CORS para permitir que tu blog hable con este servidor
  res.setHeader('Access-Control-Allow-Origin', '*'); // Puedes cambiar '*' por la URL de tu blog para más seguridad
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Title, HTTP-Referer');

  // El navegador envía una solicitud "pre-vuelo" (OPTIONS) para comprobar los permisos.
  // Respondemos que sí para permitir la solicitud real.
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Solo aceptamos solicitudes de tipo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Obtenemos la clave API de OpenRouter desde las variables de entorno seguras de Vercel
    const apiKey = process.env.OPENROUTER_API_KEY; 
    if (!apiKey) {
      throw new Error("La clave API de OpenRouter no está configurada en el servidor.");
    }

    // 2. Recogemos las instrucciones del formulario del blog
    const { keywords, searchIntent, wordCount, language, toneStyle, externalLinks, editingOutline, realtimeKnowledge } = req.body;

    // 3. Construimos el prompt para la IA (esto no cambia)
    let prompt = `Genera un artículo completo y bien estructurado.`;
    if (editingOutline) {
        prompt += ` Primero, proporciona un esquema de edición detallado. Luego, escribe el artículo basándote en ese esquema.`;
    }
    prompt += `
      Palabras clave: ${keywords}.
      Intención de búsqueda: ${searchIntent}.
      Extensión aproximada: ${wordCount} palabras.
      Idioma: ${language}.
      Tono y estilo: ${toneStyle}.`;
    if (externalLinks) {
        prompt += `\nIncluye sugerencias de enlaces externos relevantes.`;
    }
    if (realtimeKnowledge) {
      prompt += `\nUtiliza conocimiento general actualizado si es relevante para el tema.`;
    }
    prompt += `\nEl artículo debe ser coherente, atractivo y cumplir con todas las especificaciones. Formatea la respuesta en Markdown.`;

    // 4. Hacemos la llamada a la API de OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        // OpenRouter recomienda estos encabezados para identificar tu aplicación
        'HTTP-Referer': 'https://www.techebooks.online/', // <-- ¡IMPORTANTE! Reemplaza esto con la URL real de tu blog
        'X-Title': 'Generador de Articulos IA' 
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat', // <-- Usando el modelo de DeepSeek en OpenRouter
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2500,
        temperature: 0.8,
        top_p: 0.8,
      }),
    });

    // 5. Verificamos si la llamada fue exitosa
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error de la API de OpenRouter: ${errorData.error ? errorData.error.message : response.statusText}`);
    }

    // 6. Extraemos y devolvemos el artículo
    const result = await response.json();
    const text = result.choices[0].message.content;

    res.status(200).json({ articleContent: text });

  } catch (error) {
    console.error('Error en el proxy:', error);
    res.status(500).json({ error: 'Ocurrió un error al contactar con la IA.' });
  }
}
