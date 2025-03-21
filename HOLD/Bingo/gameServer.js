const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const { getRandomTrait, findMatchingNFTs, updateBingoCards } = require('./RegenBingo'); // Import game logic

const app = express();
const PORT = 3000;

const originalBingoPath = path.join(__dirname, 'BingoCards.json');
const tempBingoPath = path.join(__dirname, 'BingoCardsTemp.json');

app.use(cors({ origin: '*' })); // Allow requests from any origin

function resetBingoFile() {
    fs.copyFileSync(originalBingoPath, tempBingoPath);
}

app.get('/run-bingo', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    resetBingoFile();

    const condition = req.query.condition || "5INAROW";
    let winner = null;
    let rounds = 0;
    let traitHistory = [];
    let totalUpdatedCards = 0;
    let updatedUsers = [];

    while (!winner) {
        const randomTrait = getRandomTrait();
        traitHistory.push({ trait_type: randomTrait.trait_type, trait: randomTrait.value });

        const matchingNFTs = findMatchingNFTs(randomTrait);
        const result = updateBingoCards(matchingNFTs, condition, tempBingoPath);
        winner = result.winner;
        rounds++;

        totalUpdatedCards = result.updatesCount;
        updatedUsers = result.updatedUsers || [];

        res.write(`data: ${JSON.stringify({
            latestTrait: `${randomTrait.trait_type} - ${randomTrait.value}`,
            totalUpdatedCards,
            updatedUsers
        })}\n\n`);

        if (rounds > 100) {
            res.write(`data: ${JSON.stringify({ message: "No winner found after 100 rounds, try again later." })}\n\n`);
            res.end();
            return;
        }

        if (!winner) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    res.write(`data: ${JSON.stringify({
        message: `Bingo! Condition: ${winner.condition} (Found in ${rounds} rounds)`,
        winnerUsername: winner.winnerInfo["X Username:"],
        winnerWallet: winner.winnerInfo["ETH/Base wallet for prizes:"],
        bingoCard: winner.winnerInfo.bingo,
        winningCells: winner.winningCells
    })}\n\n`);
    res.end();
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});