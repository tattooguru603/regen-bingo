const express = require("express");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = 3000;
const bingoCardsPath = "BingoCards.json";

app.use(express.json());
app.use(cors({ origin: "*" })); // Allow frontend to send requests

// Endpoint to add a new Bingo card
app.post("/add-bingo-card", (req, res) => {
    const { username, wallet, bingo } = req.body;

    if (!username || !wallet || !bingo) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    let bingoCards = [];
    if (fs.existsSync(bingoCardsPath)) {
        bingoCards = JSON.parse(fs.readFileSync(bingoCardsPath, "utf8"));
    }

    // Create a new Bingo card object
    const newCard = {
        "X Username:": username,
        "ETH/Base wallet for prizes:": wallet,
        "bingo": bingo
    };

    bingoCards.push(newCard);
    fs.writeFileSync(bingoCardsPath, JSON.stringify(bingoCards, null, 2), "utf8");

    res.json({ message: "Bingo card added successfully!" });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
