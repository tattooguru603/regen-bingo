const express = require("express");
const fs = require("fs");
const cors = require("cors");
const app = express();

const BINGO_FILE = "BingoCards.json";

app.use(express.json());
app.use(cors({ origin: "*" }));

// ✅ API to save a new bingo card
app.post("/save-bingo-card", (req, res) => {
    const newCard = req.body;

    // Read existing file or start with an empty array
    let bingoCards = [];
    if (fs.existsSync(BINGO_FILE)) {
        bingoCards = JSON.parse(fs.readFileSync(BINGO_FILE, "utf8"));
    }

    // Append new card
    bingoCards.push(newCard);

    // Write back to the file
    fs.writeFileSync(BINGO_FILE, JSON.stringify(bingoCards, null, 2), "utf8");

    res.json({ message: "Bingo card saved successfully!" });
});

// ✅ Start server
app.listen(3000, () => console.log("Server running on http://localhost:3000"));
