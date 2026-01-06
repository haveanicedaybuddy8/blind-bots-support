(function () {
    // --------------------------------------------------------
    // 1. CONFIGURATION
    // --------------------------------------------------------
    const CONFIG = {
        // 🔴 REPLACE THIS WITH YOUR RENDER URL
        API_ENDPOINT: "https://blind-bots-support.onrender.com/support-chat", 
        THEME_COLOR: "#ef4444", 
        BOT_NAME: "Blind Bot Support"
    };

    let chatHistory = []; 
    let collectedData = {}; // Stores the "User Profile" (Name, Email, etc.) as the AI learns it
    let isOpen = false;
    let selectedFile = null;

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
      
      /* Chat Bubble (The trigger button) */
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
      
      /* Chat Window (The main box) */
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
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      
      .bb-message {
        padding: 10px 14px;
        border-radius: 10px;
        font-size: 14px;
        line-height: 1.4;
        max-width: 80%;
        word-wrap: break-word;
      }
      .bb-user {
        background: ${CONFIG.THEME_COLOR};
        color: white;
        align-self: flex-end;
        border-bottom-right-radius: 2px;
      }
      .bb-bot {
        background: #e5e7eb;
        color: #1f2937;
        align-self: flex-start;
        border-bottom-left-radius: 2px;
      }
      
      /* Image Preview in Chat */
      .bb-img-preview {
        max-width: 100%;
        border-radius: 8px;
        margin-top: 5px;
        display: block;
        border: 2px solid rgba(255,255,255,0.2);
      }

      /* Input Area Wrapper */
      #bb-input-area {
        padding: 12px;
        border-top: 1px solid #e5e7eb;
        background: white;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      /* File Preview Bar (Above input) */
      #bb-file-bar {
        display: none;
        background: #f3f4f6;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 12px;
        color: #374151;
        justify-content: space-between;
        align-items: center;
      }
      #bb-remove-file {
        color: #ef4444;
        cursor: pointer;
        font-weight: bold;
        margin-left: 10px;
      }

      /* Controls Row */
      #bb-controls {
        display: flex;
        gap: 8px;
        align-items: center;
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

      /* Buttons */
      button { border: none; background: none; cursor: pointer; }
      
      #bb-attach-btn {
        color: #6b7280;
        padding: 5px;
        display: flex;
        align-items: center;
        transition: color 0.2s;
      }
      #bb-attach-btn:hover { color: ${CONFIG.THEME_COLOR}; }

      #bb-send-btn {
        background: ${CONFIG.THEME_COLOR};
        color: white;
        border-radius: 50%;
        width: 36px;
        height: 36px;
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
  
    container.innerHTML = `
      <div id="bb-chat-window">
        <div id="bb-header">
          <span>${CONFIG.BOT_NAME}</span>
          <button id="bb-close" style="color:white;font-size:18px;">&times;</button>
        </div>
        
        <div id="bb-messages">
          <div class="bb-message bb-bot">
            Hi! I'm the support AI. I can help troubleshoot issues or file a ticket for you. <br><br>
            If you have an error, use the paperclip 📎 to upload a screenshot!
          </div>
        </div>
        
        <form id="bb-input-area">
            <div id="bb-file-bar">
                <span id="bb-filename">image.png</span>
                <span id="bb-remove-file">&times;</span>
            </div>

            <div id="bb-controls">
                <input type="file" id="bb-file-input" accept="image/*" style="display:none;">
                
                <button type="button" id="bb-attach-btn" title="Attach Screenshot">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                </button>

                <input type="text" id="bb-input" placeholder="Type a message..." autocomplete="off" />
                
                <button type="submit" id="bb-send-btn">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
            </div>
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
    const windowEl = document.getElementById("bb-chat-window");
    const input = document.getElementById("bb-input");
    const messagesDiv = document.getElementById("bb-messages");
    const fileInput = document.getElementById("bb-file-input");
    const fileBar = document.getElementById("bb-file-bar");
    const fileNameSpan = document.getElementById("bb-filename");
    const sendBtn = document.getElementById("bb-send-btn");
  
    // Toggles
    const toggleChat = () => {
        isOpen = !isOpen;
        windowEl.style.display = isOpen ? 'flex' : 'none';
        if(isOpen) input.focus();
    };
    document.getElementById("bb-chat-bubble").onclick = toggleChat;
    document.getElementById("bb-close").onclick = toggleChat;
  
    // File Selection Logic
    document.getElementById("bb-attach-btn").onclick = () => fileInput.click();
    
    fileInput.onchange = () => {
        if (fileInput.files[0]) {
            selectedFile = fileInput.files[0];
            fileNameSpan.textContent = selectedFile.name.length > 20 ? selectedFile.name.substring(0,20)+'...' : selectedFile.name;
            fileBar.style.display = "flex";
        }
    };

    document.getElementById("bb-remove-file").onclick = () => {
        selectedFile = null;
        fileInput.value = "";
        fileBar.style.display = "none";
    };

    // Helper: Convert Image to Base64
    function toBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]); // Strip the data:image/png;base64 part
            reader.onerror = error => reject(error);
        });
    }

    // Helper: Add Message to UI
    function addMessage(text, role, imgSrc = null) {
        const div = document.createElement("div");
        div.className = `bb-message ${role === "user" ? "bb-user" : "bb-bot"}`;
        
        const txt = document.createElement("div");
        txt.innerHTML = text; // Allow bold/newlines
        div.appendChild(txt);

        if (imgSrc) {
            const img = document.createElement("img");
            img.src = imgSrc;
            img.className = "bb-img-preview";
            div.appendChild(img);
        }
        
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  
    // Form Submit
    document.getElementById("bb-input-area").onsubmit = async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        
        // Don't send if empty AND no file
        if (!text && !selectedFile) return;
        
        input.disabled = true;
        sendBtn.disabled = true;

        let payload = { text: text, image: null, mimeType: null };
        let localPreviewUrl = null;

        // Process File if exists
        if (selectedFile) {
            try {
                payload.image = await toBase64(selectedFile);
                payload.mimeType = selectedFile.type;
                localPreviewUrl = URL.createObjectURL(selectedFile);
            } catch (err) {
                console.error("File Read Error:", err);
                alert("Could not process image.");
                return;
            }
        }

        // 1. Add User Message to UI Immediately
        addMessage(text, "user", localPreviewUrl);

        // Reset Inputs
        input.value = "";
        const fileToSend = selectedFile; // Store ref
        selectedFile = null;
        fileInput.value = "";
        fileBar.style.display = "none";

        // 2. Update Context History
        // Note: We do NOT push the huge base64 string to history array to keep it light.
        // The backend handles the image for the current turn only.
        chatHistory.push({ role: "user", parts: [{ text: text || "[User sent an image]" }] });
        
        try {
            // 3. Send to Server
            const res = await fetch(CONFIG.API_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    history: chatHistory,
                    userInput: payload,
                    currentData: collectedData // <--- SEND THE DATA WE KNOW SO FAR
                })
            });

            if (!res.ok) throw new Error("Server error");

            const data = await res.json();

            // 4. Update Client State with new info found by AI
            if (data.extracted_data) {
                collectedData = data.extracted_data;
                console.log("Updated User Data:", collectedData);
            }

            // 5. Add Bot Reply
            addMessage(data.reply, "bot");
            chatHistory.push({ role: "model", parts: [{ text: data.reply }] });

        } catch (err) {
            console.error(err);
            addMessage("⚠️ I'm having trouble connecting. Please try again or email rob.wen@theblindbots.com", "bot");
        } finally {
            input.disabled = false;
            sendBtn.disabled = false;
            input.focus();
        }
    };
  
})();