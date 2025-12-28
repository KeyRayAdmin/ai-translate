const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require("express");
const multer = require("multer");
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Delay function to avoid rate limits
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.use(express.json());

app.post("/api/translate", upload.single("file"), async (req, res) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "API Key is missing in Vercel settings." });
        }

        // Initialize with API Key
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // Model name ကို 'models/' prefix ထည့်ပြီး သုံးကြည့်ပါ
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const srtContent = req.file.buffer.toString("utf-8");
        const lines = srtContent.split("\n");
        
        let translatedSrt = "";
        let currentBatch = [];
        let batchSize = 60; 

        for (let i = 0; i < lines.length; i++) {
            currentBatch.push(lines[i]);

            if (currentBatch.length >= batchSize || i === lines.length - 1) {
                const batchText = currentBatch.join("\n");
                
                const prompt = `Translate the following English subtitle text into Burmese (Myanmar). 
                Keep original SRT numbering and timestamps exactly as they are. 
                Only translate the text content.
                
                Content:
                ${batchText}`;

                // API Call with Retry Logic
                let success = false;
                let attempts = 0;
                while (!success && attempts < 3) {
                    try {
                        const result = await model.generateContent(prompt);
                        const response = await result.response;
                        translatedSrt += response.text() + "\n";
                        success = true;
                    } catch (e) {
                        attempts++;
                        console.error(`Attempt ${attempts} failed:`, e.message);
                        await sleep(2000); // 2 seconds break on error
                    }
                }

                currentBatch = [];
                await sleep(1000); // Normal break between batches
            }
        }

        res.json({ success: true, translatedText: translatedSrt });
    } catch (error) {
        console.error("Main Error:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = app;
