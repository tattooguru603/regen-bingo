const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const {
  getRandomTrait,
  findMatchingNFTs,
  updateBingoCards,
} = require("./RegenBingo");

const app = express();
const PORT = 3000;

const BINGO_FILE = path.join(__dirname, "BingoCards.json");
const TEMP_FILE = path.join(__dirname, "BingoCardsTemp.json");

app.use(express.json());
app.use(cors({ origin: "*" }));

// ✅ Save a new bingo card
app.post("/save-bingo-card", (req, res) => {
  const newCard = req.body;
  let bingoCards = [];

  if (fs.existsSync(BINGO_FILE)) {
    bingoCards = JSON.parse(fs.readFileSync(BINGO_FILE, "utf8"));
  }

  bingoCards.push(newCard);

  fs.writeFileSync(BINGO_FILE, JSON.stringify(bingoCards, null, 2), "utf8");

  res.json({ message: "Bingo card saved successfully!" });
});

// ✅ Run bingo game via SSE
app.get("/run-bingo", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  fs.copyFileSync(BINGO_FILE, TEMP_FILE); // reset temp file

  const condition = req.query.condition || "5INAROW";
  let winner = null;
  let rounds = 0;
  let totalUpdatedCards = 0;
  let updatedUsers = [];

  while (!winner) {
    const randomTrait = getRandomTrait();

    const matchingNFTs = findMatchingNFTs(randomTrait);
    const result = updateBingoCards(matchingNFTs, condition, TEMP_FILE);
    winner = result.winner;
    rounds++;

    totalUpdatedCards = result.updatesCount;
    updatedUsers = result.updatedUsers || [];

    res.write(`data: ${JSON.stringify({
      latestTrait: `${randomTrait.trait_type} - ${randomTrait.value}`,
      totalUpdatedCards,
      updatedUsers
    })}\n\n`);

    if (rounds > 250) {
      res.write(`data: ${JSON.stringify({ message: "No winner found after 250 rounds, try again later." })}\n\n`);
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
    winnerWallet: winner.winnerInfo["ETH/Base wallet for prizes:"] || winner.winnerInfo["Wallet:"],
    bingoCard: winner.winnerInfo.bingo,
    winningCells: winner.winningCells
  })}\n\n`);
  res.end();
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
