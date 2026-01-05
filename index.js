import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js';
import { alertRob } from './support_mailer.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- THE KNOWLEDGE BASE ---
const TECH_CONTEXT = `
You are the Official AI Support Agent for "The Blind Bots".
You help window treatment business owners set up their AI chatbots.

YOUR KNOWLEDGE:
1. **Installation:** To install the bot, users must copy the 'Script Tag' from their Dashboard and paste it into the 'Custom Code' header/footer of their website (Wix, WordPress, Softr, etc).
2. **API Keys:** If they see "Unauthorized Access", they likely regenerated their API Key but didn't update their website script.
3. **Billing:** We use Stripe. If billing fails, the bot pauses.
4. **Customization:** They can change colors and bot names in the 'Settings' tab of the dashboard.

ESCALATION RULES:
If the user reports a BUG, a CRASH, or a feature request you cannot fulfill:
1. Do NOT lie or invent a fix.
2. Set "escalate": true in your JSON response.
3. Tell the user: "I've logged a ticket for this. Our engineer (Rob) has been notified and will push a fix shortly."
`;

app.post('/support-chat', async (req, res) => {
    try {
        const { history, userEmail } = req.body;

        // 1. Configure AI
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview", 
            systemInstruction: `
                ${TECH_CONTEXT}
                
                OUTPUT JSON ONLY:
                {
                    "reply": "string",
                    "escalate": boolean,
                    "issue_summary": "string (only if escalating)"
                }
            `,
            generationConfig: { responseMimeType: "application/json" }
        });

        // 2. Chat
        const chat = model.startChat({ history: history || [] });
        const result = await chat.sendMessage("Process the latest user input.");
        const json = JSON.parse(result.response.text());

        // 3. Handle Escalation (Ticket Creation)
        if (json.escalate) {
            const chatLog = history.map(h => `${h.role}: ${h.parts[0].text}`).join('\n');
            
            // A. Save to DB
            await supabase.from('support_tickets').insert({
                user_email: userEmail || "Guest",
                issue_summary: json.issue_summary,
                full_chat_log: chatLog
            });

            // B. Email Rob
            alertRob({
                email: userEmail,
                summary: json.issue_summary,
                log: chatLog
            });
        }

        res.json(json);

    } catch (err) {
        console.error(err);
        res.status(500).json({ reply: "I'm having a connection issue. Please email rob.wen@theblindbots.com." });
    }
});

const PORT = process.env.PORT || 4000; // Running on port 4000 to avoid local conflicts
app.listen(PORT, () => console.log(`🛡️ Support Server running on port ${PORT}`));