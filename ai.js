async function getAIReply(message) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  const hasFetchMock = typeof global.fetch === 'function' && !!global.fetch._isMockFunction;

  if (!OPENAI_KEY && !hasFetchMock) {
    // Fallback canned reply
    return `Hi, I'm ${process.env.BOT_NAME || 'GroundwaterBot'}. You said: "${message}". I can help with groundwater topics like aquifers, recharge, and contamination.`;
  }

  // Call OpenAI Chat Completions (or mocked fetch in tests)
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (OPENAI_KEY) headers.Authorization = `Bearer ${OPENAI_KEY}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: message }],
        max_tokens: 300,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('OpenAI error', res.status, err);
      return `Sorry, I'm having trouble accessing the AI right now.`;
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content;
    return reply || `Sorry, I couldn't generate a response.`;
  } catch (err) {
    console.error('Error calling OpenAI', err);
    return `Sorry, I'm having trouble right now.`;
  }
}

module.exports = { getAIReply };
