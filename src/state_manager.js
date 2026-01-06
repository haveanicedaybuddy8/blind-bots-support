// The list of "Must Have" data points before a ticket can be filed
const REQUIRED_FIELDS = [
    "full_name",
    "registration_email",
    "business_name",
    "main_email",
    "phone"
];

// Helper to make the bot ask nicely
const FIELD_QN_MAP = {
    full_name: "May I have your full name?",
    registration_email: "I need the email address associated with your 'Blind Bots' account so I can look up your subscription. Which email did you use to register?",
    business_name: "What is the name of your business?",
    main_email: "What is your best contact email?",
    phone: "What is a good phone number to reach you?"
};

export function analyzeTicketStatus(currentData) {
    // If data is null, initialize it
    const data = currentData || {};
    const missing = [];

    // Check what's missing
    for (const field of REQUIRED_FIELDS) {
        // Strict check: Must not be null and must not be an empty string
        if (!data[field] || data[field].toString().trim() === "") {
            missing.push(field);
        }
    }

    return {
        isComplete: missing.length === 0,
        missingFields: missing,
        // The "next step" is the first missing field in the list
        nextQuestion: missing.length > 0 ? FIELD_QN_MAP[missing[0]] : null
    };
}