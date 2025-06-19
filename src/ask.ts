import {asa as asa} from "./index.ts";
export default function ask(): void {
  asa.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const prefix = '!ask';
  if (!message.content.startsWith(prefix)) return;

  const prompt = message.content.slice(prefix.length).trim();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('GEMINI_API_KEY missing');
    await message.reply('Error: Falta la clave de API de Gemini.');
    return;
  }

  try {
    const body = JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Gemini error: ${res.status} ${errorText}`);
      await message.reply('Error al generar la respuesta con Gemini.');
      return;
    }

    const data = await res.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    await message.reply(responseText || 'No se pudo generar una respuesta.');
  } catch (error) {
    console.error('Error al llamar a Gemini:', error);
    await message.reply('Ocurrió un error al procesar tu solicitud.');
  }

  // <- agrega un return si quieres eliminar el warning
  return;
});

}
