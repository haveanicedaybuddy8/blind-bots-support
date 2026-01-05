import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

export async function alertRob(ticket) {
    console.log(`🚨 Escalating ticket to Rob: ${ticket.summary}`);

    const htmlBody = `
    <div style="font-family: sans-serif; border: 2px solid #ef4444; padding: 20px; border-radius: 8px;">
        <h2 style="color: #ef4444; margin-top: 0;">🚨 Tech Support Escalation</h2>
        <p><strong>User:</strong> ${ticket.email || "Guest User"}</p>
        <p><strong>Issue:</strong> ${ticket.summary}</p>
        <hr style="border-top: 1px solid #eee;">
        <h3>Chat Context:</h3>
        <pre style="background: #f8fafc; padding: 10px; font-size: 12px; white-space: pre-wrap;">${ticket.log}</pre>
    </div>
    `;

    try {
        await transporter.sendMail({
            from: `"Support Bot" <${process.env.SMTP_USER}>`,
            to: "rob.wen@theblindbots.com", // <--- Alerts YOU directly
            subject: `🔥 Support Ticket: ${ticket.summary}`,
            html: htmlBody
        });
        console.log("   ✅ Email alert sent.");
    } catch (err) {
        console.error("   ❌ Failed to send email alert:", err.message);
    }
}