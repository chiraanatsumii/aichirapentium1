// URL ini otomatis ngebaca file chat.js di dalam folder netlify/functions/
const BACKEND_URL = "/.netlify/functions/chat";

async function kirimPesan() {
    const inputField = document.getElementById("user-input");
    const pesan = inputField.value.trim();
    
    if (!pesan) return;

    tambahPesanLayar(pesan, "user-msg");
    inputField.value = ""; 

    const loadingId = tambahPesanLayar('<div class="typing-dots"><span></span><span></span><span></span></div>', "ai-msg", true);

    try {
        // Nge-fetch ke fungsi internal Netlify
        const response = await fetch(BACKEND_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                pesan: pesan 
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP Error! Status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        const balasanAI = data.choices[0].message.content;
        const targetMessageElement = document.getElementById(loadingId).querySelector('.msg-content');
        targetMessageElement.innerText = balasanAI;

    } catch (error) {
        const targetMessageElement = document.getElementById(loadingId).querySelector('.msg-content');
        targetMessageElement.innerText = `Aduh bos, ada kendala: ${error.message}`;
    }
}

function tambahPesanLayar(teks, className, isHTML = false) {
    const chatBox = document.getElementById("chat-box");
    const welcomeScreen = document.getElementById("welcome-screen");
    if (welcomeScreen) welcomeScreen.style.display = "none";

    const msgDiv = document.createElement("div");
    const msgId = "msg-" + Date.now() + Math.random().toString(36).substr(2, 5);
    msgDiv.id = msgId;
    msgDiv.className = "message " + className;
    
    if (className === "user-msg") {
        msgDiv.innerHTML = `<div class="msg-content"></div>`;
        msgDiv.querySelector('.msg-content').textContent = teks;
    } 
    else if (className === "ai-msg") {
        if (isHTML) {
            msgDiv.innerHTML = `
                <div class="ai-avatar"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
                <div class="msg-content">${teks}</div>
            `;
        } else {
            msgDiv.innerHTML = `
                <div class="ai-avatar"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
                <div class="msg-content"></div>
            `;
            msgDiv.querySelector('.msg-content').textContent = teks;
        }
    }
    
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    return msgId;
}

function handleEnter(event) {
    if (event.key === "Enter") {
        kirimPesan();
    }
}
// --- LOGIKA KALKULATOR ---
const screen = document.getElementById('screen');
let currentInput = '0';

function updateScreen() {
    screen.innerText = currentInput;
}

window.appendNumber = function(num) {
    if (currentInput === '0' && num !== '.') {
        currentInput = num;
    } else {
        if (num === '.' && currentInput.includes('.')) {
            const parts = currentInput.split(/[\+\-\*\/]/);
            const lastPart = parts[parts.length - 1];
            if (lastPart.includes('.')) return;
        }
        currentInput += num;
    }
    updateScreen();
}

window.appendOperator = function(op) {
    const lastChar = currentInput.slice(-1);
    if (['+', '-', '*', '/'].includes(lastChar)) {
        currentInput = currentInput.slice(0, -1) + op;
    } else if (currentInput !== '0') {
        currentInput += op;
    } else {
        currentInput = '0' + op;
    }
    updateScreen();
}

window.calculate = function() {
    try {
        const result = eval(currentInput);
        currentInput = String(result);
    } catch (error) {
        currentInput = 'Error';
    }
    updateScreen();
}

window.clearScreen = function() {
    currentInput = '0';
    updateScreen();
}

window.deleteLast = function() {
    if (currentInput.length > 1) {
        currentInput = currentInput.slice(0, -1);
    } else {
        currentInput = '0';
    }
    updateScreen();
}

// --- NAVIGASI HALAMAN & MODE ---
function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    if (pageId === 'ai-page') {
        document.getElementById('header-title').textContent = '💬 Shiroko AI buatan chira';
    } else if (pageId === 'calc-page') {
        document.getElementById('header-title').textContent = '🧮 Kalkulator';
    }
    
    // Tutup sidebar
    document.getElementById('sidebar').classList.remove('active');
}

function toggleModeMenu() {
    document.getElementById('sidebar').classList.toggle('active');
}

function selectMode(mode) {
    document.getElementById('modeModal').classList.remove('active');
    if (mode === 'ai') {
        switchPage('ai-page');
    } else if (mode === 'calc') {
        switchPage('calc-page');
    }
}