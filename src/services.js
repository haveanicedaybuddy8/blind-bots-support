import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables from the parent .env file
dotenv.config();

// --- CONFIGURATION ---
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

/**
 * 1. UPLOAD IMAGE
 * Takes a Base64 string, converts it to a file, uploads to Supabase, 
 * and returns the permanent public URL.
 */
export async function uploadImageToSupabase(base64Data, mimeType) {
    if (!base64Data) return null;

    try {
        const fileName = `upload_${Date.now()}.png`;
        // Convert Base64 to Buffer for upload
        const buffer = Buffer.from(base64Data, 'base64');

        const { data, error } = await supabase.storage
            .from('support-uploads') // Make sure this bucket exists in Supabase!
            .upload(fileName, buffer, {
                contentType: mimeType || 'image/png',
                upsert: false
            });

        if (error) {
            console.error("❌ Supabase Upload Error:", error.message);
            return null;
        }

        // Get Public URL
        const { data: publicUrlData } = supabase.storage
            .from('support-uploads')
            .getPublicUrl(fileName);

        return publicUrlData.publicUrl;

    } catch (err) {
        console.error("❌ Image Service Failed:", err.message);
        return null;
    }
}

/**
 * 2. SAVE TICKET TO DB
 * Saves all collected data into the 'support_tickets' table.
 */
export async function saveTicketToDB(ticketData) {
    try {
        const { error } = await supabase
            .from('support_tickets')
            .insert({
                user_email: ticketData.main_email,       // Required by your original schema
                registration_email: ticketData.reg_email,
                business_name: ticketData.business_name,
                phone: ticketData.phone,
                issue_summary: ticketData.issue_summary,
                full_chat_log: JSON.stringify(ticketData.chat_history), // Save full context
                attachment_url: ticketData.attachment_url || null
            });

        if (error) throw error;
        console.log("✅ Ticket saved to Supabase DB");
        return true;

    } catch (err) {
        console.error("❌ DB Save Failed:", err.message);
        return false;
    }
}

/**
 * 3. EMAIL ALERT
 * Sends the formatted email to you with the attachment.
 */
export async function emailRob(ticketData) {
    console.log(`📧 Sending email alert to Rob for: ${ticketData.business_name}`);

    const htmlBody = `
    <div style="font-family: sans-serif; border: 2px solid #ef4444; padding: 20px; border-radius: 8px;">
        <h2 style="color: #ef4444; margin-top: 0;">🔥 New Support Ticket</h2>
        
        <table style="width: 100%; text-align: left; border-collapse: collapse;">
            <tr><td style="padding: 5px; font-weight: bold;">Name:</td><td>${ticketData.full_name}</td></tr>
            <tr><td style="padding: 5px; font-weight: bold;">Business:</td><td>${ticketData.business_name}</td></tr>
            <tr><td style="padding: 5px; font-weight: bold;">Phone:</td><td>${ticketData.phone}</td></tr>
            <tr><td style="padding: 5px; font-weight: bold;">Main Email:</td><td>${ticketData.main_email}</td></tr>
            <tr><td style="padding: 5px; font-weight: bold;">Reg Email:</td><td>${ticketData.reg_email}</td></tr>
        </table>

        <hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">
        
        <h3 style="color: #333;">Issue Summary:</h3>
        <p style="background: #fef2f2; padding: 10px; border-radius: 5px; font-size: 16px;">
            ${ticketData.issue_summary}
        </p>

        ${ticketData.attachment_url ? 
            `<p><strong>Attachment:</strong> <a href="${ticketData.attachment_url}">View Screenshot</a></p>` 
            : ""}

        <hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">
        
        <details>
            <summary style="cursor: pointer; color: #6b7280; font-size: 12px;">View Full Chat Log</summary>
            <pre style="background: #f8fafc; padding: 10px; font-size: 11px; white-space: pre-wrap; margin-top: 10px;">
${JSON.stringify(ticketData.chat_history, null, 2)}
            </pre>
        </details>
    </div>
    `;

    // Construct the email object
    const mailOptions = {
        from: `"Blind Bot Support" <${process.env.SMTP_USER}>`,
        to: "rob.wen@theblindbots.com",
        subject: `Ticket: ${ticketData.business_name} - ${ticketData.issue_summary}`,
        html: htmlBody
    };

    // If there is an image URL, we can also attach it directly as a file so you don't have to click the link
    if (ticketData.attachment_url) {
        mailOptions.attachments = [{
            path: ticketData.attachment_url 
        }];
    }

    try {
        await transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully.");
        return true;
    } catch (err) {
        console.error("❌ Email Failed:", err.message);
        return false;
    }
}