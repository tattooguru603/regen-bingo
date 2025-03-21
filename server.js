require("dotenv").config();
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

// 🔁 Fetch workaround for CommonJS
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const BINGO_FILE = path.join(__dirname, "BingoCards.json");
const TEMP_FILE = path.join(__dirname, "BingoCardsTemp.json");

app.use(express.json());
app.use(cors({ origin: "*" }));

// ✅ Serve static files from ./public
app.use(express.static(path.join(__dirname, "public")));

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

// ✅ OpenSea NFT Proxy Route
app.get("/opensea-nfts/:wallet", async (req, res) => {
  const wallet = req.params.wallet;
  const apiKey = process.env.OPENSEA_API_KEY;
  const url = `https://api.opensea.io/api/v2/chain/base/account/${wallet}/nfts?collection=re-gens`;

  try {
    const data = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-api-key": apiKey,
      },
    }).then(res => res.json());

    res.json(data);
  } catch (err) {
    console.error("OpenSea fetch error:", err);
    res.status(500).json({ error: "Failed to fetch NFTs" });
  }
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
      updatedUsers,
    })}\n\n`);

    if (rounds > 250) {
      res.write(`data: ${JSON.stringify({ message: "No winner found after 250 rounds, try again later." })}\n\n`);
      res.end();
      return;
    }

    if (!winner) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  res.write(`data: ${JSON.stringify({
    message: `Bingo! Condition: ${winner.condition} (Found in ${rounds} rounds)`,
    winnerUsername: winner.winnerInfo["X Username:"],
    winnerWallet: winner.winnerInfo["ETH/Base wallet for prizes:"] || winner.winnerInfo["Wallet:"],
    bingoCard: winner.winnerInfo.bingo,
    winningCells: winner.winningCells,
  })}\n\n`);
  res.end();
});

app.get("/", (req, res) => {
  res.redirect("/BingoCardEntry.html");
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
