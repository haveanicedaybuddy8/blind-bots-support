(function () {
  // --------------------------------------------------------
  // 1. CONFIGURATION
  // --------------------------------------------------------
  const CONFIG = {
    // 🔴 REPLACE THIS WITH YOUR RENDER URL
    API_ENDPOINT: "https://blind-bots-support.onrender.com/support-chat", 
    THEME_COLOR: "#ef4444", // Matches the red in your mailer code
    BOT_NAME: "Blind Bot Support"
  };

  let chatHistory = []; // Stores conversation for the AI context
  let isOpen = false;

  // --------------------------------------------------------
  // 2. CREATE STYLES
  // --------------------------------------------------------
  const style = document.createElement("style");
  style.innerHTML = `
    #bb-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    #bb-chat-bubble {
      width: 60px;
      height: 60px;
      background-color: ${CONFIG.THEME_COLOR};
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }
    #bb-chat-bubble:hover { transform: scale(1.05); }
    #bb-chat-bubble svg { width: 30px; height: 30px; fill: white; }
    
    #bb-chat-window {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 350px;
      height: 500px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.15);
      display: none;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #e5e7eb;
    }
    #bb-header {
      background: ${CONFIG.THEME_COLOR};
      color: white;
      padding: 16px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #bb-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      background: #f9fafb;
    }
    .bb-message {
      margin-bottom: 12px;
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 14px;
      line-height: 1.4;
    }
    .bb-user {
      background: ${CONFIG.THEME_COLOR};
      color: white;
      margin-left: auto;
      border-bottom-right-radius: 2px;
    }
    .bb-bot {
      background: #e5e7eb;
      color: #1f2937;
      margin-right: auto;
      border-bottom-left-radius: 2px;
    }
    #bb-input-area {
      padding: 12px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
      background: white;
    }
    #bb-input {
      flex: 1;
      border: 1px solid #d1d5db;
      border-radius: 20px;
      padding: 8px 16px;
      outline: none;
      font-size: 14px;
    }
    #bb-input:focus { border-color: ${CONFIG.THEME_COLOR}; }
    #bb-send-btn {
      background: ${CONFIG.THEME_COLOR};
      color: white;
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #bb-send-btn:disabled { background: #9ca3af; cursor: not-allowed; }
  `;
  document.head.appendChild(style);

  // --------------------------------------------------------
  // 3. BUILD DOM ELEMENTS
  // --------------------------------------------------------
  const container = document.createElement("div");
  container.id = "bb-widget-container";

  // Chat Bubble
  container.innerHTML = `
    <div id="bb-chat-window">
      <div id="bb-header">
        <span>${CONFIG.BOT_NAME}</span>
        <button id="bb-close" style="background:none;border:none;color:white;cursor:pointer;font-size:18px;">&times;</button>
      </div>
      <div id="bb-messages">
        <div class="bb-message bb-bot">Hi! I'm the Blind Bots support AI. How can I help you today?</div>
      </div>
      <form id="bb-input-area">
        <input type="text" id="bb-input" placeholder="Type a message..." autocomplete="off" />
        <button type="submit" id="bb-send-btn">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </form>
    </div>
    <div id="bb-chat-bubble">
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
    </div>
  `;
  document.body.appendChild(container);

  // --------------------------------------------------------
  // 4. LOGIC
  // --------------------------------------------------------
  const bubble = document.getElementById("bb-chat-bubble");
  const windowEl = document.getElementById("bb-chat-window");
  const closeBtn = document.getElementById("bb-close");
  const form = document.getElementById("bb-input-area");
  const input = document.getElementById("bb-input");
  const messagesDiv = document.getElementById("bb-messages");
  const sendBtn = document.getElementById("bb-send-btn");

  // Toggle Window
  function toggleChat() {
    isOpen = !isOpen;
    windowEl.style.display = isOpen ? "flex" : "none";
    if (isOpen) input.focus();
  }
  bubble.addEventListener("click", toggleChat);
  closeBtn.addEventListener("click", toggleChat);

  // Append Message to UI
  function addMessage(text, sender) {
    const div = document.createElement("div");
    div.className = `bb-message ${sender === "user" ? "bb-user" : "bb-bot"}`;
    div.textContent = text;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // Handle Submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    // 1. Add User Message
    addMessage(text, "user");
    input.value = "";
    input.disabled = true;
    sendBtn.disabled = true;

    // 2. Update History (Gemini Format)
    chatHistory.push({ role: "user", parts: [{ text: text }] });

    try {
      // 3. Call Backend
      const response = await fetch(CONFIG.API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: chatHistory,
          userEmail: "visitor@web.site" // You can grab this from a cookie or input if needed
        })
      });

      if (!response.ok) throw new Error("Network response was not ok");

      const data = await response.json();

      // 4. Add Bot Message
      addMessage(data.reply, "bot");
      
      // 5. Update History
      chatHistory.push({ role: "model", parts: [{ text: data.reply }] });

    } catch (err) {
      console.error(err);
      addMessage("⚠️ Sorry, I'm having trouble connecting to the server.", "bot");
    } finally {
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  });

})();