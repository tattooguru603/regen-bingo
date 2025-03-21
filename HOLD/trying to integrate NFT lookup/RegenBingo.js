import fs from 'fs';

const traitsPath = 'UniqueRegenTraits.json';
const regenDataPath = 'AllRegenData.json';

const traits = JSON.parse(fs.readFileSync(traitsPath, 'utf8'));
const regenData = JSON.parse(fs.readFileSync(regenDataPath, 'utf8'));

export const getRandomTrait = () => traits[Math.floor(Math.random() * traits.length)];

export const findMatchingNFTs = (trait) => {
    return regenData.filter(nft =>
        nft.traits.some(t => t.trait_type === trait.trait_type && t.value === trait.value)
    ).map(nft => nft.nftId.toString()); // Convert NFT IDs to strings to ensure consistent matching
};

const checkBingoWin = (bingoCard, condition) => {
    const winningCells = [];
    
    // Define all possible winning lines
    const rows = [
        ['R1,C1', 'R1,C2', 'R1,C3', 'R1,C4', 'R1,C5'],
        ['R2,C1', 'R2,C2', 'R2,C3', 'R2,C4', 'R2,C5'],
        ['R3,C1', 'R3,C2', 'R3,C3', 'R3,C4', 'R3,C5'],
        ['R4,C1', 'R4,C2', 'R4,C3', 'R4,C4', 'R4,C5'],
        ['R5,C1', 'R5,C2', 'R5,C3', 'R5,C4', 'R5,C5']
    ];
    
    const cols = [
        ['R1,C1', 'R2,C1', 'R3,C1', 'R4,C1', 'R5,C1'],
        ['R1,C2', 'R2,C2', 'R3,C2', 'R4,C2', 'R5,C2'],
        ['R1,C3', 'R2,C3', 'R3,C3', 'R4,C3', 'R5,C3'],
        ['R1,C4', 'R2,C4', 'R3,C4', 'R4,C4', 'R5,C4'],
        ['R1,C5', 'R2,C5', 'R3,C5', 'R4,C5', 'R5,C5']
    ];
    
    const diagonals = [
        ['R1,C1', 'R2,C2', 'R3,C3', 'R4,C4', 'R5,C5'],
        ['R1,C5', 'R2,C4', 'R3,C3', 'R4,C2', 'R5,C1']
    ];
    
    // Helper function to check if a line is complete
    const isLineComplete = (line) => {
        return line.every(cell => cell === 'R3,C3' || bingoCard[cell]?.includes('-HIT'));
    };

    if (condition === "5INAROW") {
        for (let line of [...rows, ...cols, ...diagonals]) {
            if (isLineComplete(line)) {
                winningCells.push(...line);
                return { condition, winningCells };
            }
        }
    }

    if (condition === "CROSS") {
        if (isLineComplete(rows[2]) && isLineComplete(cols[2])) {
            winningCells.push(...rows[2], ...cols[2]);
            return { condition, winningCells };
        }
    }

    if (condition === "DCROSS") {
        if (isLineComplete(diagonals[0]) && isLineComplete(diagonals[1])) {
            winningCells.push(...diagonals[0], ...diagonals[1]);
            return { condition, winningCells };
        }
    }

    if (condition === "BLACKOUT") {
        if ([...rows, ...cols, ...diagonals].flat().every(cell => cell === 'R3,C3' || bingoCard[cell]?.includes('-HIT'))) {
            winningCells.push(...rows.flat(), ...cols.flat());
            return { condition, winningCells };
        }
    }

    return null;
};

export const updateBingoCards = (matchingNFTs, condition, bingoFilePath) => {
    let bingoCards = JSON.parse(fs.readFileSync(bingoFilePath, 'utf8'));
    let winner = null;
    let updatesCount = 0;
    let updatedUsers = [];

    bingoCards.forEach(card => {
        let cardUpdated = false;
        if (card.bingo) {
            Object.entries(card.bingo).forEach(([key, value]) => {
                let valueStr = value.toString();
                if (matchingNFTs.includes(valueStr) && !valueStr.endsWith('-HIT')) {
                    card.bingo[key] = `${valueStr}-HIT`;
                    updatesCount++;
                    cardUpdated = true;
                }
            });
        }
        if (cardUpdated) {
            updatedUsers.push(card["X Username:"] || "Unknown");
            const winResult = checkBingoWin(card.bingo, condition);
            if (winResult) {
                winner = { winnerInfo: card, ...winResult };
            }
        }
    });

    fs.writeFileSync(bingoFilePath, JSON.stringify(bingoCards, null, 2), 'utf8');
    return { winner, updatesCount, updatedUsers };
};