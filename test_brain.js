import { processChat } from './src/ai_engine.js';

// Mock empty data
let currentData = {
    full_name: null,
    business_name: null,
    main_email: null,
    registration_email: null,
    phone: null,
    issue_summary: null
};

// Mock History
const history = [];

async function testTurn(userMessage) {
    console.log(`\n👨‍💻 USER: ${userMessage}`);
    const userInput = { text: userMessage, image: null };
    
    // Call the engine
    const response = await processChat(history, userInput, currentData);
    
    console.log(`🤖 BOT: ${response.reply}`);
    console.log(`   [Escalate: ${response.escalate_flag}]`);
    console.log(`   [Data: ${JSON.stringify(response.extracted_data)}]`);

    // Simulate "saving" the data for the next turn
    currentData = { ...currentData, ...response.extracted_data };
    
    // Update history for context
    history.push({ role: "user", parts: [{ text: userMessage }] });
    history.push({ role: "model", parts: [{ text: response.reply }] });
}

(async () => {
    // Turn 1: Ask a general question (Should NOT escalate)
    await testTurn("How much does this bot cost?");

    // Turn 2: Report a bug (Should likely trigger escalation or troubleshooting)
    await testTurn("It's broken. I am getting a 500 error.");

    // Turn 3: User confirms they want help (Should trigger data collection)
    await testTurn("Yes please file a ticket.");

    // Turn 4: Provide name (Should update data)
    await testTurn("My name is Rob Wen.");
})();