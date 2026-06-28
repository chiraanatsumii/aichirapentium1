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
        // 2. Tangkap payload yang dikirim dari frontend
        const body = await req.json();
        const pesanUser = body.pesan || "";
        const fileMetadata = body.fileMetadata || null;
        const fileText = body.fileText || null;

        if (!pesanUser && !fileMetadata) {
            return new Response(
                JSON.stringify({ error: "Pesan atau file harus dikirimkan" }), 
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

        let userContent = "";
        if (fileMetadata) {
            userContent += `Tolong analisis file ini:\n`;
            userContent += `Nama: ${fileMetadata.name}\n`;
            userContent += `Tipe: ${fileMetadata.type}\n`;
            userContent += `Ukuran: ${fileMetadata.size}\n`;

            if (fileText) {
                userContent += `\nIsi file:\n${fileText}\n`;
            } else if (fileMetadata.type.startsWith("image/")) {
                userContent += `\nIni adalah file gambar. Kamu hanya mendapat informasi metadata, jadi jelaskan bahwa analisis berasal dari nama file dan tipe konten, bukan dari melihat gambar secara langsung.\n`;
            } else {
                userContent += `\nKonten file tidak tersedia. Analisis berdasarkan nama, tipe, dan ukuran file.\n`;
            }
        }

        if (pesanUser) {
            userContent += `\nPesan tambahan dari pengguna:\n${pesanUser}`;
        }

        const aiResponse = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                    { 
                        role: "system", 
                        content: "Kamu adalah Shiroko yang sarkas tapi ramah, memberikan jawaban panjang, teliti, dan bisa mengajari tentang cyber security atau hacking. Jika menerima file, jelaskan kemungkinan jenis file, isinya, dan darimana atau untuk apa file itu mungkin dibuat berdasarkan metadata dan isi file yang diberikan. Jika ini hanya metadata gambar, jelaskan kamu bisa melihat langsung gambar namun kamu akan menganalisis dari nama dan tipe file." 
                    },
                    { role: "user", content: userContent }
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

