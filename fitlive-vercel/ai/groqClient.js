/**
 * ai/groqClient.js
 * -------------------------------------------------------------------------------------------------
 * Groq API client for FitLive AI features
 * Model: llama-3.1-8b-instant (FREE tier available)
 * 
 * Groq offers ultra-fast AI responses with generous free limits
 * Get your free API key at: https://console.groq.com/keys
 * -------------------------------------------------------------------------------------------------
 */

const Groq = require('groq-sdk');

/**
 * Initialize Groq client
 * API key is read at runtime to avoid dotenv loading issues
 */
function getGroqClient() {
  const API_KEY = process.env.GROQ_API_KEY;
  
  if (!API_KEY || API_KEY.trim() === '' || API_KEY === 'YOUR_GROQ_API_KEY_HERE') {
    throw new Error(
      'GROQ_KEY_MISSING: Add GROQ_API_KEY to your .env file. ' +
      'Get free key at: https://console.groq.com/keys'
    );
  }
  
  return new Groq({ apiKey: API_KEY.trim() });
}

/**
 * Call Groq chat completion API
 *
 * @param {Array}  messages  - [{role:'system'|'user'|'assistant', content:'...'}]
 * @param {number} maxTokens - max output tokens (default 300)
 * @returns {Promise<string>} - plain text response from Groq
 */
async function chatCompletion(messages, maxTokens = 300) {
  // Read API key at call time (not module load time)
  const client = getGroqClient();
  
  // Convert messages to Groq format
  const groqMessages = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'assistant' : msg.role,
    content: msg.content
  }));
  
  // Groq chat completion request
  const completion = await client.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: groqMessages,
    max_tokens: maxTokens,
    temperature: 0.7,
    top_p: 0.95,
    stream: false
  });
  
  // Extract response text
  const response = completion.choices[0]?.message?.content;
  if (!response) {
    throw new Error('Groq returned empty response');
  }
  
  return response.trim();
}

module.exports = { chatCompletion };
