import fs from 'fs/promises';
import path from 'path';

// Define where the knowledge files live
const KNOWLEDGE_DIR = path.join(process.cwd(), 'knowledge');

export async function getProductContext() {
    try {
        // 1. Read the files concurrently
        const [pricing, technical, issues] = await Promise.all([
            readFileSafe('pricing.txt'),
            readFileSafe('technical.txt'),
            readFileSafe('common_issues.txt')
        ]);

        // 2. Combine them into a formatted system prompt section
        return `
        === PRODUCT KNOWLEDGE BASE ===
        
        [PRICING & CREDITS]
        ${pricing}

        [wk TECHNICAL SPECS & INSTALLATION]
        ${technical}

        [COMMON ISSUES & DEBUGGING]
        ${issues}
        
        ==============================
        Use this knowledge to answer user questions. 
        If the answer is found in the [TECHNICAL SPECS], quote the logic specifically.
        `;

    } catch (err) {
        console.error("⚠️ Error loading knowledge base:", err);
        return "Error loading product context. Please contact Rob directly.";
    }
}

// Helper: Reads a file but returns empty string if missing (prevents crashes)
async function readFileSafe(filename) {
    try {
        const filePath = path.join(KNOWLEDGE_DIR, filename);
        const content = await fs.readFile(filePath, 'utf-8');
        return content.trim();
    } catch (err) {
        console.warn(`⚠️ Warning: Could not find knowledge file: ${filename}`);
        return ""; 
    }
}