// netlify/functions/chat.js

export default async (req, context) => {
    // 1. Hanya izinkan request POST dari frontend
    if (req.method !== "POST") {
        return new Response(
            JSON.stringify({ error: "Method Not Allowed" }), 
            { status: 405, headers: { "Content-Type": "application/json" } }
        );
    }

    try {
        // 2. Tangkap pesan yang dikirim dari input chat frontend
        const body = await req.json();
        const pesanUser = body.pesan;

        if (!pesanUser) {
            return new Response(
                JSON.stringify({ error: "Pesan tidak boleh kosong" }), 
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // 3. Mengambil API Key secara aman dari Environment Variable Netlify
        const apiKey = process.env.AI_API_KEY;

        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: "API Key belum diisi di dashboard Netlify, bos!" }), 
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        // 4. Hubungkan ke API AI (Contoh ini menggunakan OpenRouter untuk akses Gemini)
        // Kalau pakai OpenAI asli, ganti URL-nya ke: https://api.openai.com/v1/chat/completions
        const API_URL = "https://openrouter.ai/api/v1/chat/completions";

        const aiResponse = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "google/gemini-2.5-flash", // Kamu bisa ganti model AI-nya di sini
                messages: [
                    { 
                        role: "system", 
                        content: "Kamu adalah Shiroko yang sikap nya sarkas dan suka memberi jawaban sarkas dan panjang teliti dan bisa di ajak curhat dan mengajari cara tentang cyber security." 
                    },
                    { role: "user", content: pesanUser }
                ]
            })
        });

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            throw new Error(`API AI Error: ${aiResponse.status} - ${errorText}`);
        }

        const data = await aiResponse.json();

        // 5. Kirim balik datanya ke frontend (Strukturnya otomatis cocok dengan data.choices[0] di frontendmu)
        return new Response(
            JSON.stringify(data), 
            { status: 200, headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        // Menampilkan error ke layar chat kalau backend bermasalah
        return new Response(
            JSON.stringify({ error: error.message }), 
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
};
