import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { uploadImageToSupabase, saveTicketToDB, emailRob } from './src/services.js';
import { processChat } from './src/ai_engine.js';
import { analyzeTicketStatus } from './src/state_manager.js';

dotenv.config();
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(cors());
app.use(express.static('public'));

app.post('/support-chat', async (req, res) => {
    try {
        const { history, userInput, currentData } = req.body;
        let publicImageUrl = null;

        // 1. Upload Image
        if (userInput.image) {
            console.log("📎 Image received. Uploading to Supabase...");
            publicImageUrl = await uploadImageToSupabase(userInput.image, userInput.mimeType);
        }

        // 2. AI Processing
        const aiResponse = await processChat(history, userInput, currentData);
        
        // 3. Merge Data
        const updatedData = { 
            ...currentData, 
            ...aiResponse.extracted_data,
            attachment_url: publicImageUrl || currentData?.attachment_url || null 
        };

        // 4. Check Status
        const status = analyzeTicketStatus(updatedData);

        // 🔴 FIX 3: Robust Save Condition
        // If ticket is complete, we save it regardless of the flag, 
        // because completeness implies intent.
        if (status.isComplete) {
            
            console.log("✅ All data collected. Saving ticket...");
            
            const dbResult = await saveTicketToDB({
                ...updatedData,
                chat_history: history
            });

            await emailRob({
                ...updatedData,
                chat_history: history
            });

            if (dbResult) {
                // Force a success message if the AI didn't generate one
                if (!aiResponse.reply.includes("Ticket Created")) {
                    aiResponse.reply += " 🎟️ **Ticket Created!** I have sent your details to our engineering team.";
                }
            }
        }

        res.json({
            reply: aiResponse.reply,
            extracted_data: updatedData
        });

    } catch (err) {
        console.error("❌ Server Error:", err);
        res.status(500).json({ reply: "I'm having a connection error. Please try again." });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🛡️  Blind Bots Support Server running on port ${PORT}`));