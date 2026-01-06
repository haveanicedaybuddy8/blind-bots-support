// test_services.js
import { saveTicketToDB, emailRob } from './src/services.js';

const mockData = {
    full_name: "Test User",
    business_name: "Test Blinds Co",
    main_email: "test@example.com",
    reg_email: "admin@testblinds.com",
    phone: "555-0199",
    issue_summary: "Testing the service module integration",
    chat_history: [{ role: "user", parts: [{ text: "Help me" }] }],
    attachment_url: null
};

(async () => {
    console.log("--- Testing DB Save ---");
    await saveTicketToDB(mockData);
    
    console.log("--- Testing Email ---");
    await emailRob(mockData);
})();