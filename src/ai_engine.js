import { GoogleGenerativeAI } from "@google/generative-ai";
import { getProductContext } from './knowledge_base.js';
import { analyzeTicketStatus } from './state_manager.js';
import dotenv from 'dotenv';

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function processChat(history, userInput, currentData) {
    // 1. Get Static Knowledge (The Manual)
    const productContext = await getProductContext();

    // 2. Get Logic Status (The Checklist)
    const status = analyzeTicketStatus(currentData);
    
    // 3. Construct the System Prompt
    const systemPrompt = `
    You are "Blind Bot Support". You are helpful, technical, and concise.

    === YOUR KNOWLEDGE BASE ===
    ${productContext}

    === CRITICAL RULE: IDENTITY VERIFICATION ===
    You CANNOT file a ticket or check account status without the user's **Registration Email**. 
    If the user refuses to give it or says "I don't know," explain that you cannot find their account or subscription without it.

    === CURRENT USER DATA ===
    ${JSON.stringify(currentData)}

    === MISSION RULES ===
    1. **PHASE 1 (Troubleshooting):** - Answer user questions using the KNOWLEDGE BASE.
       - If they share an error, explain it.
       - If the solution is simple (e.g., "Add phone number"), tell them.
       - DO NOT ask for personal details yet.

    2. **PHASE 2 (Escalation):** - Triggers ONLY if:
         a) The user says "That didn't work" multiple times.
         b) The user explicitly asks for a human/ticket.
         c) The issue is a 500 error or code crash (not user error).
       - If Escalation is needed, set "escalate_flag": true.

    3. **PHASE 3 (Data Collection):**
       - If "escalate_flag" is true (or was true in previous turns), you MUST collect these missing fields: [${status.missingFields.join(', ')}].
       - Ask for them ONE BY ONE. 
       - Current missing item to ask for: "${status.nextQuestion || 'None'}".
    
    === JSON OUTPUT FORMAT ONLY ===
    {
        "reply": "string (what you say to user)",
        "escalate_flag": boolean (true if we have moved to Phase 2/3),
        "extracted_data": {
            "full_name": "string or null",
            "business_name": "string or null",
            "main_email": "string or null",
            "registration_email": "string or null",
            "phone": "string or null",
            "issue_summary": "string (update this as you learn more)"
        }
    }
    `;

    // 4. Call Gemini
    const model = genAI.getGenerativeModel({ 
        model: "gemini-3-flash-preview",
        systemInstruction: systemPrompt,
        generationConfig: { responseMimeType: "application/json" }
    });

    // Prepare message (handle image if present)
    const userParts = [{ text: userInput.text || "..." }];
    if (userInput.image) {
        userParts.push({
            inlineData: {
                data: userInput.image,
                mimeType: userInput.mimeType
            }
        });
    }

    try {
        const chat = model.startChat({ history: history });
        const result = await chat.sendMessage(userParts);
        const text = result.response.text();
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (err) {
        console.error("AI Engine Error:", err);
        return { 
            reply: "I'm having a brain freeze. Please try again.", 
            escalate_flag: false, 
            extracted_data: currentData 
        };
    }
}