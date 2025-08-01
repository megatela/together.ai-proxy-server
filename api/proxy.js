// No se necesita ninguna librería especial, solo `fetch` que ya viene con la plataforma de Vercel

export default async function handler(req, res) {
  // Configuración de CORS para permitir solicitudes desde cualquier dominio.
  // Para mayor seguridad, puedes cambiar '*' por la URL de tu blog.
  // Ejemplo: res.setHeader('Access-Control-Allow-Origin', 'https://tu-blog.com');
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // El navegador envía una solicitud OPTIONS "pre-vuelo" para comprobar los permisos CORS antes de enviar la solicitud POST.
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Solo permitimos solicitudes de tipo POST, rechazamos cualquier otra
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Obtenemos la clave API de forma segura desde las variables de entorno de Vercel
    // Este nombre (TOGETHER_API_KEY) debe coincidir con el que configures en Vercel.
    const apiKey = process.env.TOGETHER_API_KEY; 
    if (!apiKey) {
      throw new Error("La clave API de Together AI no está configurada en el servidor.");
    }

    // Recogemos los datos que el formulario del blog nos envía en el cuerpo de la solicitud
    const { keywords, searchIntent, wordCount, language, toneStyle, externalLinks, editingOutline, realtimeKnowledge } = req.body;

    // Construimos el "prompt" o las instrucciones para la IA.
    // Esta parte es la que puedes personalizar para cambiar lo que hace la IA.
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
      // Nota: El modelo base no está conectado a internet. Esta instrucción es una sugerencia para el estilo del modelo.
      prompt += `\nUtiliza conocimiento general actualizado si es relevante para el tema.`;
    }
    prompt += `\nEl artículo debe ser coherente, atractivo y cumplir con todas las especificaciones. Formatea la respuesta en Markdown.`;

    // Hacemos la llamada a la API de Together AI
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}` // La autenticación se hace con un encabezado "Bearer"
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3-70b-chat-hf', // Modelo recomendado: Llama 3 de 70B. Es excelente.
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2500, // Límite de tokens para la respuesta para evitar artículos excesivamente largos
        temperature: 0.8, // Un valor entre 0.7 y 0.9 suele ser bueno para la creatividad
        top_p: 0.8,
      }),
    });

    // Verificamos si la llamada a la API tuvo algún error
    if (!response.ok) {
        const errorData = await response.json();
        // Lanzamos un error con el mensaje que nos da la API para poder depurar
        throw new Error(`Error de la API de Together AI: ${errorData.error ? errorData.error.message : response.statusText}`);
    }

    const result = await response.json();
    // Extraemos el texto del artículo generado de la estructura de la respuesta
    const text = result.choices[0].message.content;

    // Enviamos el artículo generado de vuelta al blog
    res.status(200).json({ articleContent: text });

  } catch (error) {
    // Si algo falla en cualquier punto, registramos el error en los logs de Vercel y enviamos un mensaje de error genérico
    console.error('Error en el proxy:', error);
    res.status(500).json({ error: 'Ocurrió un error al contactar con la IA.' });
  }
}
