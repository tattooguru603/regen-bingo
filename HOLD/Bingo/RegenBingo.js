const fs = require('fs');

const traitsPath = 'UniqueRegenTraits.json';
const regenDataPath = 'AllRegenData.json';
const bingoCardsPath = 'BingoCards.json';

const traits = JSON.parse(fs.readFileSync(traitsPath, 'utf8'));
const regenData = JSON.parse(fs.readFileSync(regenDataPath, 'utf8'));
let bingoCards = JSON.parse(fs.readFileSync(bingoCardsPath, 'utf8'));

function getRandomTrait() {
    return traits[Math.floor(Math.random() * traits.length)];
}

function findMatchingNFTs(trait) {
    return regenData.filter(nft =>
        nft.traits.some(t => t.trait_type === trait.trait_type && t.value === trait.value)
    ).map(nft => nft.nftId.toString());
}

function checkBingoWin(card, condition) {
    const size = 5;
    let rows = Array(size).fill(0);
    let cols = Array(size).fill(0);
    let winningCells = [];

    for (let r = 1; r <= size; r++) {
        for (let c = 1; c <= size; c++) {
            let key = `R${r},C${c}`;
            if (card.bingo[key] && card.bingo[key].endsWith('-HIT')) {
                rows[r - 1]++;
                cols[c - 1]++;
            }
        }
    }

    if (condition === "5INAROW") {
        for (let i = 0; i < size; i++) {
            if (rows[i] === size) {
                winningCells = Array.from({ length: size }, (_, idx) => `R${i + 1},C${idx + 1}`);
                break;
            }
            if (cols[i] === size) {
                winningCells = Array.from({ length: size }, (_, idx) => `R${idx + 1},C${i + 1}`);
                break;
            }
        }
    } else if (condition === "CROSS") {
        if (rows[2] === size && cols[2] === size) {
            winningCells = [
                ...Array.from({ length: size }, (_, idx) => `R3,C${idx + 1}`),
                ...Array.from({ length: size }, (_, idx) => `R${idx + 1},C3`)
            ];
        }
    } else if (condition === "BLACKOUT") {
        if (rows.every(row => row === size)) {
            winningCells = Object.keys(card.bingo);
        }
    }

    return winningCells.length > 0 ? { condition, winningCells, winnerInfo: card } : null;
}

function updateBingoCards(matchingNFTs, condition, bingoFilePath) {
    if (!bingoFilePath) {
        throw new Error("Bingo file path is required.");
    }

    let bingoCards = JSON.parse(fs.readFileSync(bingoFilePath, 'utf8')); // Read from temp file
    let updatesCount = 0;
    let winner = null;
    let updatedUsers = [];

    bingoCards.forEach(card => {
        let cardUpdated = false;
        if (card.bingo) {
            Object.entries(card.bingo).forEach(([key, value]) => {
                if (matchingNFTs.includes(value.toString()) && !value.endsWith('-HIT')) {
                    card.bingo[key] = `${value}-HIT`;
                    updatesCount++;
                    cardUpdated = true;
                }
            });
        }
        if (cardUpdated) {
            updatedUsers.push(card["X Username:"] || "Unknown");
            const winResult = checkBingoWin(card, condition);
            if (winResult) {
                winner = winResult;
            }
        }
    });

    // Write changes back to the temporary file
    fs.writeFileSync(bingoFilePath, JSON.stringify(bingoCards, null, 2), 'utf8');

    return { winner, updatesCount, updatedUsers };
}

module.exports = { getRandomTrait, findMatchingNFTs, updateBingoCards, checkBingoWin };
