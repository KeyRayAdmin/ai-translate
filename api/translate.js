const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require("express");
const multer = require("multer");
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

app.use(express.json());

app.post("/api/translate", upload.single("file"), async (req, res) => {
    try {
        const srtContent = req.file.buffer.toString("utf-8");
        const lines = srtContent.split("\n");
        
        // Batch processing (70 lines per batch)
        let translatedSrt = "";
        let currentBatch = [];
        let batchSize = 70;

        for (let i = 0; i < lines.length; i++) {
            currentBatch.push(lines[i]);
            if (currentBatch.length >= batchSize || i === lines.length - 1) {
                const prompt = `Translate the following English subtitle text into Burmese (Myanmar). 
                Keep original SRT timestamps and numbering format. 
                Return only the translated SRT content.\n\n${currentBatch.join("\n")}`;

                const result = await model.generateContent(prompt);
                translatedSrt += result.response.text() + "\n";
                currentBatch = [];
            }
        }

        res.json({ success: true, translatedText: translatedSrt });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = app;
