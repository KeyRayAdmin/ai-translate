const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require("express");
const multer = require("multer");
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Python မှာ သုံးတဲ့ Model Name အတိုင်း ပြင်ပေးထားပါ
const MODEL_NAME = "gemini-1.5-flash"; 

app.use(express.json());

// Delay function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.post("/api/translate", upload.single("file"), async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("API Key missing in environment variables");
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        const srtContent = req.file.buffer.toString("utf-8");
        const lines = srtContent.split("\n");
        
        let translatedSrt = "";
        let currentBatch = [];
        let batchSize = 50; // Quota မထိအောင် batch size ကို နည်းနည်းလျှော့ထားပါတယ်

        for (let i = 0; i < lines.length; i++) {
            currentBatch.push(lines[i]);

            if (currentBatch.length >= batchSize || i === lines.length - 1) {
                const batchText = currentBatch.join("\n");
                const prompt = `Translate the following English subtitle lines into Burmese (Myanmar). 
                Keep original SRT timestamps and numbering. Return only the translated SRT content.\n\n${batchText}`;

                // API Call
                const result = await model.generateContent(prompt);
                const response = await result.response;
                translatedSrt += response.text() + "\n";
                
                currentBatch = [];

                // Free Tier RPM အတွက် ခဏ စောင့်ပေးခြင်း (Rate limiting fix)
                await sleep(2000); 
            }
        }

        res.json({ success: true, translatedText: translatedSrt });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = app;
