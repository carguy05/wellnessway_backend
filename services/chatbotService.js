const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} else {
  console.warn('GEMINI_API_KEY not found in environment variables. Gemini features will be disabled.');
}

// System prompt template for Mr. Vaidya
const SYSTEM_PROMPT_TEMPLATE = (
  "You are Mr. Vaidya, a soft-spoken, empathetic medical advisory assistant.\n" +
  "- Speak in a caring, calm tone.\n" +
  "- Your primary role is to provide general, educational information about symptoms and conditions.\n" +
  "- DO NOT provide any diagnoses, prescriptions, or definitive medical advice. This is crucial.\n" +
  "- If the user asks an unrelated question, reply gently: '⚠️ I can only help with medical-related queries.'\n" +
  "- For any medical query, always provide information on self-care measures and strongly recommend consulting a healthcare professional.\n" +
  "- Use the requested language: {language}.\n" +
  "- End every response with the disclaimer: '⚠️ This is not a substitute for professional medical consultation.'\n\n"
);

/**
 * Get Mr. Vaidya reply using Gemini AI
 * @param {Array} messages - Conversation history array with {role, content}
 * @param {String} language - Language for the response (default: "English")
 * @param {String} attachmentBase64 - Base64 encoded image (optional)
 * @param {String} attachmentMimeType - MIME type of the image (optional)
 * @returns {Promise<String>} - The assistant's reply
 */
async function getMrVaidyaReply(messages = [], language = "English", attachmentBase64 = null, attachmentMimeType = "image/png") {
  if (!genAI) {
    throw new Error('Gemini API is not configured. Please set GEMINI_API_KEY in your environment variables.');
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Build conversation history for chat
    const history = [];
    
    // Add system prompt as initial user message and model acknowledgment
    history.push({
      role: 'user',
      parts: [{ text: SYSTEM_PROMPT_TEMPLATE.replace('{language}', language) }]
    });
    
    history.push({
      role: 'model',
      parts: [{ text: 'Understood. I will follow all the provided instructions.' }]
    });

    // Add conversation history (excluding the last user message which we'll send separately)
    for (let i = 0; i < messages.length - 1; i++) {
      const msg = messages[i];
      if (msg.role === 'user') {
        history.push({
          role: 'user',
          parts: [{ text: msg.content || '' }]
        });
      } else if (msg.role === 'assistant') {
        history.push({
          role: 'model',
          parts: [{ text: msg.content || '' }]
        });
      }
    }

    // Prepare the last user message
    const lastMessage = messages[messages.length - 1];
    const lastUserMessageParts = [];
    
    // Add text content
    if (lastMessage.content) {
      lastUserMessageParts.push({ text: lastMessage.content });
    }
    
    // Add attachment if provided
    if (attachmentBase64) {
      lastUserMessageParts.push({
        inlineData: {
          mimeType: attachmentMimeType,
          data: attachmentBase64
        }
      });
    }

    // Configure safety settings
    const safetySettings = [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_NONE'
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_NONE'
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_NONE'
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE'
      }
    ];

    // Start chat with history
    const chat = model.startChat({
      history: history,
      safetySettings: safetySettings
    });

    // Send the last user message
    const result = await chat.sendMessage(lastUserMessageParts);
    const response = await result.response;
    const text = response.text();

    if (text) {
      return text;
    } else {
      const promptFeedback = response.promptFeedback();
      if (promptFeedback && promptFeedback.blockReason) {
        console.log('Content was blocked. Block reason:', promptFeedback.blockReason);
        return "I'm sorry, I cannot respond to that query. It may have been flagged for safety reasons.";
      }
      return "Sorry, I couldn't generate a response. Please try again.";
    }
  } catch (error) {
    console.error('Error calling Gemini:', error);
    throw new Error(`Gemini API error: ${error.message}`);
  }
}

/**
 * Generate chatbot response (wrapper for backward compatibility)
 * @param {String} userMessage - User's message
 * @param {Array} conversationHistory - Previous conversation messages
 * @param {String} language - Language for response
 * @param {String} attachmentBase64 - Base64 encoded image
 * @param {String} attachmentMimeType - MIME type of image
 * @returns {Promise<Object>} - Response object with message and type
 */
async function generateResponse(userMessage, conversationHistory = [], language = "English", attachmentBase64 = null, attachmentMimeType = "image/png") {
  try {
    // Build messages array for Gemini
    const messages = [...conversationHistory, { role: 'user', content: userMessage }];
    
    const reply = await getMrVaidyaReply(messages, language, attachmentBase64, attachmentMimeType);
    
    return {
      message: reply,
      type: 'chat'
    };
  } catch (error) {
    console.error('Error generating response:', error);
    return {
      message: "I'm sorry, I'm experiencing technical difficulties. Please try again later.",
      type: 'error'
    };
  }
}

// Legacy function for backward compatibility
function analyzeSymptoms(symptoms) {
  // This is kept for backward compatibility but won't be used with Gemini
  // The Gemini model handles symptom analysis directly
  return {
    symptomsAnalyzed: symptoms.toLowerCase().split(/[,\s]+/).filter(s => s.length > 0),
    conditions: [],
    remedies: [],
    precautions: []
  };
}

module.exports = {
  getMrVaidyaReply,
  generateResponse,
  analyzeSymptoms
// Chatbot service removed. Export stub functions that indicate removal.
}