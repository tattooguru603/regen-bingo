const express = require("express");
const fs = require("fs");
const cors = require("cors");
const { getRandomTrait, findMatchingNFTs, updateBingoCards } = require("./RegenBingo");

const app = express();
const PORT = 3000;
const bingoCardsPath = "BingoCards.json";

app.use(express.json());
app.use(cors({ origin: "*" })); // Allow frontend access

// ✅ Route: Submit a New Bingo Card
app.post("/add-bingo-card", (req, res) => {
    const { username, wallet, bingo } = req.body;

    if (!username || !wallet || !bingo) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    let bingoCards = [];
    if (fs.existsSync(bingoCardsPath)) {
        bingoCards = JSON.parse(fs.readFileSync(bingoCardsPath, "utf8"));
    }

    const newCard = {
        "X Username:": username,
        "ETH/Base wallet for prizes:": wallet,
        "bingo": bingo
    };

    bingoCards.push(newCard);
    fs.writeFileSync(bingoCardsPath, JSON.stringify(bingoCards, null, 2), "utf8");

    res.json({ message: "Bingo card added successfully!" });
});

// ✅ Route: Run Bingo Game Until a Winner is Found
app.get("/run-bingo", async (req, res) => {
    const { condition } = req.query;

    if (!condition) {
        return res.status(400).json({ message: "No condition specified." });
    }

    let winner = null;
    let rounds = 0;
    let latestTrait, totalUpdatedCards, updatedUsers;

    while (!winner) {
        rounds++;
        const trait = getRandomTrait();
        latestTrait = `${trait.trait_type}: ${trait.value}`;
        const matchingNFTs = findMatchingNFTs(trait);
        
        const result = updateBingoCards(matchingNFTs, condition, bingoCardsPath);
        totalUpdatedCards = result.updatesCount;
        updatedUsers = result.updatedUsers;
        winner = result.winner;

        // Simulate delay between rounds
        await new Promise(resolve => setTimeout(resolve, 2000));

        if (winner) {
            return res.json({
                message: `Bingo! Condition: ${condition} (Found in ${rounds} rounds)`,
                winnerUsername: winner.winnerInfo["X Username:"],
                winnerWallet: winner.winnerInfo["ETH/Base wallet for prizes:"],
                bingoCard: winner.winnerInfo.bingo,
                winningCells: winner.winningCells,
                latestTrait,
                totalUpdatedCards,
                updatedUsers
            });
        }
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
