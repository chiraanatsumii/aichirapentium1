// netlify/functions/chat.js

exports.handler = async function (event, context) {
    // Pastikan cuma nerima metode POST dari web lu
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        // Ambil pesan dari frontend
        const body = JSON.parse(event.body);
        const pesan_bos = body.pesan || "";

        // Ambil API Key dari settingan Environment Netlify
        const API_KEY = process.env.GROQ_API_KEY;
        const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

        const payload = {
            model: "llama-3.1-8b-instant",
            temperature: 0.3,
            messages: [
                {
                    role: "system",
                    content: "Kamu adalah Shiroko yang sikap nya sarkas dan suka memberi jawaban yang tidak sarkas dan ramah dan panjang teliti dan bisa di ajak curhat dan mengajari cara tentang cyber security atau hacking."
                },
                {
                    role: "user",
                    content: pesan_bos
                }
            ]
        };

        // Karena Netlify pakai Node 18+, fetch udah otomatis bawaan
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: errorData.error?.message || "Ada error dari Groq bos" })
            };
        }

        const data = await response.json();
        
        // Kirim balasan balik ke frontend
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error("Error dari Netlify Function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
