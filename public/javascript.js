// URL ini otomatis ngebaca file chat.js di dalam folder netlify/functions/
const BACKEND_URL = "/.netlify/functions/chat";

async function kirimPesan() {
    const inputField = document.getElementById("user-input");
    const pesan = inputField.value.trim();
    
    if (!pesan || pesan.trim() === "") {
        console.log("Pesan kosong, abort");
        return;
    }

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

function tambahPesanLayar(teks, className, isHTML = false, isImage = false) {
    const chatBox = document.getElementById("chat-box");
    const welcomeScreen = document.getElementById("welcome-screen");
    if (welcomeScreen) welcomeScreen.style.display = "none";

    // Debug: log the text to see spaces
    console.log("Text to display:", JSON.stringify(teks));
    console.log("Text length:", teks.length);
    console.log("Has spaces:", teks.includes(' '));

    const msgDiv = document.createElement("div");
    const msgId = "msg-" + Date.now() + Math.random().toString(36).substr(2, 5);
    msgDiv.id = msgId;
    msgDiv.className = "message " + className;
    
    if (className === "user-msg") {
        if (isImage) {
            msgDiv.innerHTML = `<div class="msg-content"><img src="${teks}" alt="foto terkirim" class="sent-image"></div>`;
        } else if (isHTML) {
            msgDiv.innerHTML = `<div class="msg-content">${teks}</div>`;
        } else {
            msgDiv.innerHTML = `<div class="msg-content"></div>`;
            msgDiv.querySelector('.msg-content').textContent = teks;
        }
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
        event.preventDefault();
        kirimPesan();
    }
}

function bukaFilePerangkat() {
    document.getElementById("fileInput").click();
}

function handleFileSelection(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = function(e) {
            tambahPesanLayar(e.target.result, "user-msg", false, true);
            tambahPesanLayar("📎 File diterima! Apa yang ingin kamu tahu dari file ini?", "ai-msg");
            tampilkanInputAnalisisFile(file);
        };
        reader.readAsDataURL(file);
    } else {
        const fileHtml = `
            <div class="attachment-file">
                <span class="attachment-icon">📄</span>
                <div>
                    <div class="attachment-name">${file.name}</div>
                    <div class="attachment-meta">${formatFileSize(file.size)}</div>
                </div>
            </div>
        `;
        tambahPesanLayar(fileHtml, "user-msg", true);
        tambahPesanLayar("📎 File diterima! Apa yang ingin kamu tahu dari file ini?", "ai-msg");
        tampilkanInputAnalisisFile(file);
    }

    event.target.value = "";
}

function tampilkanInputAnalisisFile(file) {
    const inputField = document.getElementById("user-input");
    inputField.placeholder = "Misalnya: 'Analisis file ini' atau 'Apa isi file?'";
    inputField.focus();
    
    const originalKirimPesan = window.kirimPesan;
    window.kirimPesan = function() {
        const pertanyaan = inputField.value;
        if (!pertanyaan || pertanyaan.trim() === "") return;
        
        tambahPesanLayar(pertanyaan, "user-msg");
        inputField.value = "";
        inputField.placeholder = "Ketik pesan ke shiroko...";
        
        window.kirimPesan = originalKirimPesan;
        kirimFileUntukAnalisisDenganPertanyaan(file, pertanyaan);
    };
}

async function kirimFileUntukAnalisisDenganPertanyaan(file, pertanyaan) {
    const loadingId = tambahPesanLayar('<div class="typing-dots"><span></span><span></span><span></span></div>', "ai-msg", true);

    const metadata = {
        name: file.name,
        type: file.type || "unknown",
        size: formatFileSize(file.size),
    };

    let fileText = null;
    if (file.type.startsWith("text/") || file.name.match(/\.(txt|md|csv|json|html|js|py|css)$/i)) {
        fileText = await bacaFileTeks(file);
    }

    const body = {
        pesan: pertanyaan,
        fileMetadata: metadata,
        fileText: fileText,
    };

    try {
        const response = await fetch(BACKEND_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP Error! Status: ${response.status}`);
        }

        const data = await response.json();
        const balasanAI = data.choices[0].message.content;
        const targetMessageElement = document.getElementById(loadingId).querySelector('.msg-content');
        targetMessageElement.innerText = balasanAI;
    } catch (error) {
        const targetMessageElement = document.getElementById(loadingId).querySelector('.msg-content');
        targetMessageElement.innerText = `Aduh bos, ada kendala di analisis file: ${error.message}`;
    }
}

function bacaFileTeks(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.onerror = function() {
            reject(new Error("Gagal membaca file teks."));
        };
        reader.readAsText(file);
    });
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// --- LOGIKA KALKULATOR ---
const screen = document.getElementById('screen');
let currentInput = '0';

function updateScreen() {
    if (screen) screen.innerText = currentInput;
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
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');
    
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) {
        if (pageId === 'ai-page') {
            headerTitle.textContent = '💬 Shiroko AI buatan chira';
        } else if (pageId === 'calc-page') {
            headerTitle.textContent = '🧮 Kalkulator';
        } else if (pageId === 'game-page') {
            headerTitle.textContent = '🎮 Game Tetris';
        }
    }
    
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('active');
}

function toggleModeMenu() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('active');
}

function selectMode(mode) {
    const modal = document.getElementById('modeModal');
    if (modal) modal.classList.remove('active');
    if (mode === 'ai') {
        switchPage('ai-page');
    } else if (mode === 'calc') {
        switchPage('calc-page');
    } else if (mode === 'game') {
        switchPage('game-page');
    }
}

// --- LOGIKA GAME TETRIS ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const gridCanvas = document.getElementById('gridCanvas');
const gridCtx = gridCanvas ? gridCanvas.getContext('2d') : null;

const UKURAN_BLOK = 20;
const LEBAR_PAPAN = 10;
const TINGGI_PAPAN = 20;

let papanPermainan = [];
let bentukSaatIni = null;
let bentukBerikutnya = null;
let skor = 0;
let totalBaris = 0;
let level = 1;
let rekorTertinggi = parseInt(localStorage.getItem('tetrisHighScore')) || 0;
let gameJalan = false;
let gameJeda = false;
let waktuTerakhir = 0;
let spasiDitekan = false;
let intervalGerakSentuh = null;
let delayJatuhSentuh = 100;

const bentukTetris = [
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[2, 0, 0], [2, 2, 2], [0, 0, 0]],
    [[0, 0, 3], [3, 3, 3], [0, 0, 0]],
    [[4, 4], [4, 4]],
    [[0, 5, 5], [5, 5, 0], [0, 0, 0]],
    [[0, 6, 0], [6, 6, 6], [0, 0, 0]],
    [[7, 7, 0], [0, 7, 7], [0, 0, 0]]
];

const warnaBentuk = [
    '#000000', '#00FFFF', '#0000FF', '#FFC0CB', '#FFFF00', '#00FF00', '#800080', '#FF0000'
];

function putarSuara(namaSuara) {
    try {
        if (typeof suaraSuara !== 'undefined' && suaraSuara[namaSuara]) {
            suaraSuara[namaSuara].currentTime = 0;
            suaraSuara[namaSuara].play().catch(() => {});
        }
    } catch (e) {
        // Audio error handler
    }
}

function buatBentukBaru() {
    const randomIndex = Math.floor(Math.random() * bentukTetris.length);
    const bentuk = bentukTetris[randomIndex];

    return {
        bentuk: bentuk,
        x: Math.floor(LEBAR_PAPAN / 2) - Math.floor(bentuk[0].length / 2),
        y: 0,
        warna: randomIndex + 1
    };
}

function cekGerakanValid(bentuk, dx, dy, rotasi) {
    const bentukBaru = rotasi !== undefined ? putarBentuk(bentuk.bentuk, rotasi) : bentuk.bentuk;
    const xBaru = bentuk.x + dx;
    const yBaru = bentuk.y + dy;

    for (let y = 0; y < bentukBaru.length; y++) {
        for (let x = 0; x < bentukBaru[y].length; x++) {
            if (bentukBaru[y][x]) {
                const papanX = xBaru + x;
                const papanY = yBaru + y;

                if (papanX < 0 || papanX >= LEBAR_PAPAN || papanY >= TINGGI_PAPAN) {
                    return false;
                }

                if (papanY >= 0 && papanPermainan[papanY] && papanPermainan[papanY][papanX] !== 0) {
                    return false;
                }
            }
        }
    }
    return true;
}

function putarBentuk(matriks) {
    const N = matriks.length;
    let bentukPutar = [];
    for (let i = 0; i < N; i++) {
        bentukPutar[i] = [];
        for (let j = 0; j < N; j++) {
            bentukPutar[i][j] = matriks[N - 1 - j][i];
        }
    }
    return bentukPutar;
}

function tempatkanBentuk() {
    for (let y = 0; y < bentukSaatIni.bentuk.length; y++) {
        for (let x = 0; x < bentukSaatIni.bentuk[y].length; x++) {
            if (bentukSaatIni.bentuk[y][x]) {
                const xPapan = bentukSaatIni.x + x;
                const yPapan = bentukSaatIni.y + y;

                if (yPapan < 0) {
                    gameSelesai();
                    return;
                }
                papanPermainan[yPapan][xPapan] = bentukSaatIni.warna;
            }
        }
    }

    putarSuara('jatuh');
    hapusBarisLengkap();

    bentukSaatIni = bentukBerikutnya;
    bentukBerikutnya = buatBentukBaru();

    bentukSaatIni.x = Math.floor(LEBAR_PAPAN / 2) - Math.floor(bentukSaatIni.bentuk[0].length / 2);
    bentukSaatIni.y = 0;

    if (!cekGerakanValid(bentukSaatIni, 0, 0)) {
        gameSelesai();
    }
}

function hapusBarisLengkap() {
    let barisHapus = 0;
    for (let y = TINGGI_PAPAN - 1; y >= 0; y--) {
        if (papanPermainan[y].every(sel => sel !== 0)) {
            papanPermainan.splice(y, 1);
            papanPermainan.unshift(new Array(LEBAR_PAPAN).fill(0));
            barisHapus++;
            y++;
        }
    }

    if (barisHapus > 0) {
        if (barisHapus === 4) {
            putarSuara('tetris');
        } else {
            putarSuara('hapusBaris');
        }

        const levelLama = level;
        totalBaris += barisHapus;
        skor += hitungSkorBaris(barisHapus);
        level = Math.floor(totalBaris / 10) + 1;

        if (level > levelLama) {
            putarSuara('naikLevel');
        }
    }
}

function hitungSkorBaris(baris) {
    const skorDasar = [0, 100, 300, 500, 800];
    return skorDasar[baris] * level;
}

function gerakanBentuk(dx, dy) {
    if (!gameJalan || gameJeda) return false;

    if (cekGerakanValid(bentukSaatIni, dx, dy)) {
        bentukSaatIni.x += dx;
        bentukSaatIni.y += dy;

        if (dx !== 0) {
            putarSuara('gerak');
        }

        gambarPapan();
        return true;
    }
    return false;
}

function putarBentukSekarang() {
    if (!gameJalan || gameJeda) return false;

    const bentukPutar = putarBentuk(bentukSaatIni.bentuk);
    const offsetUji = [0, -1, 1, -2, 2];
    for (const offset of offsetUji) {
        if (cekGerakanValid({ ...bentukSaatIni, bentuk: bentukPutar }, offset, 0)) {
            bentukSaatIni.bentuk = bentukPutar;
            bentukSaatIni.x += offset;
            putarSuara('putar');
            gambarPapan();
            return true;
        }
    }
    return false;
}

function jatuhkanLangsung() {
    if (!gameJalan || gameJeda) return;

    let dy = 0;
    while (cekGerakanValid(bentukSaatIni, 0, dy + 1)) {
        dy++;
        skor += 2;
    }

    bentukSaatIni.y += dy;
    tempatkanBentuk();
}

function gambarBlok(ctxTarget, x, y, warna) {
    if (!ctxTarget) return;
    ctxTarget.fillStyle = warnaBentuk[warna];
    ctxTarget.fillRect(x * UKURAN_BLOK, y * UKURAN_BLOK, UKURAN_BLOK, UKURAN_BLOK);

    ctxTarget.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctxTarget.lineWidth = 1;
    ctxTarget.strokeRect(x * UKURAN_BLOK, y * UKURAN_BLOK, UKURAN_BLOK, UKURAN_BLOK);

    ctxTarget.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctxTarget.fillRect(x * UKURAN_BLOK + 2, y * UKURAN_BLOK + 2, UKURAN_BLOK - 4, 4);
    ctxTarget.fillRect(x * UKURAN_BLOK + 2, y * UKURAN_BLOK + 2, 4, UKURAN_BLOK - 4);
}

function gambarPapan() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < TINGGI_PAPAN; y++) {
        for (let x = 0; x < LEBAR_PAPAN; x++) {
            if (papanPermainan[y][x] !== 0) {
                gambarBlok(ctx, x, y, papanPermainan[y][x]);
            }
        }
    }

    if (bentukSaatIni) {
        for (let y = 0; y < bentukSaatIni.bentuk.length; y++) {
            for (let x = 0; x < bentukSaatIni.bentuk[y].length; x++) {
                if (bentukSaatIni.bentuk[y][x]) {
                    gambarBlok(ctx, bentukSaatIni.x + x, bentukSaatIni.y + y, bentukSaatIni.warna);
                }
            }
        }
    }
}

function loopPermainan(waktu) {
    if (!gameJalan || gameJeda) return;

    const deltaWaktu = waktu - waktuTerakhir;
    const intervalJatuh = Math.max(100, 1000 - (level - 1) * 50);

    if (deltaWaktu > intervalJatuh) {
        if (!gerakanBentuk(0, 1)) {
            tempatkanBentuk();
        }
        waktuTerakhir = waktu;
    }

    gambarPapan();
    requestAnimationFrame(loopPermainan);
}

function inisialisasiGame() {
    papanPermainan = [];
    for (let y = 0; y < TINGGI_PAPAN; y++) {
        papanPermainan[y] = new Array(LEBAR_PAPAN).fill(0);
    }
    gambarGrid();
}

function gambarGrid() {
    if (!gridCtx) return;
    gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    gridCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    gridCtx.lineWidth = 1;

    for (let x = 0; x <= LEBAR_PAPAN; x++) {
        gridCtx.beginPath();
        gridCtx.moveTo(x * UKURAN_BLOK, 0);
        gridCtx.lineTo(x * UKURAN_BLOK, canvas.height);
        gridCtx.stroke();
    }

    for (let y = 0; y <= TINGGI_PAPAN; y++) {
        gridCtx.beginPath();
        gridCtx.moveTo(0, y * UKURAN_BLOK);
        gridCtx.lineTo(canvas.width, y * UKURAN_BLOK);
        gridCtx.stroke();
    }
}

function mulaiGame() {
    inisialisasiGame();
    skor = 0;
    totalBaris = 0;
    level = 1;
    gameJalan = true;
    gameJeda = false;

    bentukBerikutnya = buatBentukBaru();
    bentukSaatIni = buatBentukBaru();

    const gameOverScreen = document.getElementById('gameOver');
    if (gameOverScreen) gameOverScreen.style.display = 'none';
    
    const pauseScreen = document.getElementById('pauseScreen');
    if (pauseScreen) pauseScreen.style.display = 'none';

    waktuTerakhir = performance.now();
    requestAnimationFrame(loopPermainan);
}

function gameSelesai() {
    gameJalan = false;
    putarSuara('gameOver');

    const rekorBaru = skor > rekorTertinggi;
    if (rekorBaru) {
        rekorTertinggi = skor;
        localStorage.setItem('tetrisHighScore', rekorTertinggi.toString());
        const newHighScoreElem = document.getElementById('newHighSore');
        if (newHighScoreElem) newHighScoreElem.style.display = 'block';
    } else {
        const newHighScoreElem = document.getElementById('newHighSore');
        if (newHighScoreElem) newHighScoreElem.style.display = 'none';
    }

    const finalScoreElem = document.getElementById('finalScore');
    if (finalScoreElem) finalScoreElem.textContent = skor;
    
    const finalLinesElem = document.getElementById('finalLines');
    if (finalLinesElem) finalLinesElem.textContent = totalBaris;
    
    const gameOverScreen = document.getElementById('gameOver');
    if (gameOverScreen) gameOverScreen.style.display = 'flex';
}

function toggleJeda() {
    if (!gameJalan) return;

    gameJeda = !gameJeda;
    const pauseScreen = document.getElementById('pauseScreen');
    if (pauseScreen) pauseScreen.style.display = gameJeda ? 'flex' : 'none';

    if (!gameJeda) {
        waktuTerakhir = performance.now();
        requestAnimationFrame(loopPermainan);
    }
}

function handleTouchStart(button, dx, dy, isSlowDrop = false) {
    if (!gameJalan || gameJeda) return;
    clearInterval(intervalGerakSentuh);

    if (dx !== 0 || (dy !== 0 && !isSlowDrop)) {
        gerakanBentuk(dx, dy);
    }

    if (dx !== 0 || isSlowDrop) {
        const interval = (dx !== 0) ? 100 : delayJatuhSentuh;

        intervalGerakSentuh = setInterval(() => {
            if (isSlowDrop) {
                if (gerakanBentuk(0, 1)) {
                    skor += 1;
                } else {
                    clearInterval(intervalGerakSentuh);
                    tempatkanBentuk();
                }
            } else {
                gerakanBentuk(dx, dy);
            }
        }, interval);
    }
}

function handleTouchEnd() {
    clearInterval(intervalGerakSentuh);
    intervalGerakSentuh = null;
}

function handleRotationTouch() {
    if (!gameJalan || gameJeda) return;
    putarBentukSekarang();
}

// --- PERBAIKAN EVENT LISTENER KEYBOARD (KUNCI SPASI AMAN DI SINI) ---
document.addEventListener('keydown', (e) => {
    // Jika user sedang mengetik di input field chat, abaikan kontrol game sepenuhnya
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return; 
    }

    if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        if (!gameJalan) return;
        if (gameJeda) {
            toggleJeda();
            return;
        }
        if (!spasiDitekan) {
            spasiDitekan = true;
            jatuhkanLangsung();
        }
        return;
    }

    if (!gameJalan || gameJeda) return;

    switch (e.key.toLowerCase()) {
        case 'a':
        case 'arrowleft':
            gerakanBentuk(-1, 0);
            break;
        case 'd':
        case 'arrowright':
            gerakanBentuk(1, 0);
            break;
        case 'w':
        case 'arrowup':
            putarBentukSekarang();
            break;
        case 's':
        case 'arrowdown':
            if (gerakanBentuk(0, 1)) {
                skor += 1;
            } else {
                tempatkanBentuk();
            }
            break;
        case 'p':
            jatuhkanLangsung();
            break;
        default:
            return;
    }
    e.preventDefault();
});

document.addEventListener('keyup', (e) => {
    // Jika user sedang mengetik di input field chat, abaikan lepas tombol game
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return; 
    }

    if (e.key === ' ' || e.key === 'Spacebar') {
        spasiDitekan = false;
    }
    if (e.key.toLowerCase() === 'p') {
        toggleJeda();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    inisialisasiGame();
});
