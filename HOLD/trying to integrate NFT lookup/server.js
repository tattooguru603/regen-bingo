import express from "express";
import fs from "fs";
import cors from "cors";
import fetch from "node-fetch";
import { getRandomTrait, findMatchingNFTs, updateBingoCards } from "./RegenBingo.js";

const app = express();
const PORT = 3000;
const bingoCardsPath = "BingoCards.json";

const OPENSEA_API_KEY = "24dbd7a531574309b7362c5526ba3cad";  // Replace with your OpenSea API key
const CONTRACT_ADDRESS = "0x56dFE6ae26bf3043DC8Fdf33bF739B4fF4B3BC4A"; // Replace with your NFT collection contract

app.use(express.json());
app.use(cors({ origin: "*" })); // Allow frontend access

// ✅ Fetch NFTs owned by the user from OpenSea for the correct collection
async function getUserNFTs(wallet) {
    const url = `https://api.opensea.io/api/v1/assets?owner=${wallet}&asset_contract_address=${CONTRACT_ADDRESS}&limit=100`;

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "X-API-KEY": OPENSEA_API_KEY,
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            console.error("Error fetching NFT data:", response.statusText);
            return null; // Return null to signal an error
        }

        const data = await response.json();
        return data.assets.map(nft => nft.token_id); // Extract NFT token IDs
    } catch (error) {
        console.error("Error fetching NFTs:", error);
        return null;
    }
}

// ✅ Route: Submit a New Bingo Card (Verify Ownership Against the Collection)
app.post("/add-bingo-card", async (req, res) => {
    const { username, wallet, bingo } = req.body;

    if (!username || !wallet || !bingo) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    const userNFTs = await getUserNFTs(wallet);
    if (userNFTs === null) {
        return res.status(500).json({ message: "Error fetching NFT data. Please try again later." });
    }
    if (userNFTs.length === 0) {
        return res.status(400).json({ message: "No NFTs found for this wallet in the specified collection." });
    }

    // Validate that all submitted NFT IDs are owned by the user
    for (const key in bingo) {
        if (key !== "R3,C3") { // Skip "FREE" space
            const nftId = bingo[key].toString(); // Ensure string format
            if (!userNFTs.includes(nftId)) {
                return res.status(400).json({ message: `NFT ID ${nftId} is not owned by the provided wallet.` });
            }
        }
    }

    // Save the valid Bingo card
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

    res.json({ message: "Bingo card added successfully and NFT ownership verified!" });
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
