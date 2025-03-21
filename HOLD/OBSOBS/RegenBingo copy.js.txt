const fs = require('fs');
const readline = require('readline');

const traitsPath = 'UniqueRegenTraits.json';
const regenDataPath = 'AllRegenData.json';
const bingoCardsPath = 'BingoCards.json';

const traits = JSON.parse(fs.readFileSync(traitsPath, 'utf8'));
const regenData = JSON.parse(fs.readFileSync(regenDataPath, 'utf8'));
let bingoCards = JSON.parse(fs.readFileSync(bingoCardsPath, 'utf8'));

const getRandomTrait = () => traits[Math.floor(Math.random() * traits.length)];

const findMatchingNFTs = (trait) => {
  return regenData.filter(nft =>
    nft.traits.some(t => t.trait_type === trait.trait_type && t.value === trait.value)
  ).map(nft => nft.nftId.toString());
};

const checkBingoWin = (card, condition) => {
  const size = 5;
  let rows = Array(size).fill(0);
  let cols = Array(size).fill(0);
  let diag1 = 0, diag2 = 0;
  let winningCells = [];

  for (let r = 1; r <= size; r++) {
    for (let c = 1; c <= size; c++) {
      let key = `R${r},C${c}`;
      if (card.bingo[key] && card.bingo[key].endsWith('HIT')) {
        rows[r - 1]++;
        cols[c - 1]++;
        if (r === c) diag1++;
        if (r + c === size + 1) diag2++;
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
        ...Array.from({ length: size }, (_, idx) => `R3,C${idx + 1}`), // Middle row
        ...Array.from({ length: size }, (_, idx) => `R${idx + 1},C3`)  // Middle column
      ];
    }
  } else if (condition === "BLACKOUT") {
    if (rows.every(row => row === size)) {
      winningCells = Object.keys(card.bingo);
    }
  }

  return winningCells.length > 0 ? { condition, winningCells, winnerInfo: card } : null;
};

const visualizeBingoCard = (card, winningCells) => {
  const size = 5;
  let grid = Array.from({ length: size }, () => Array(size).fill('     '));

  winningCells.forEach(cell => {
    let [row, col] = cell.replace('R', '').replace('C', '').split(',').map(Number);
    grid[row - 1][col - 1] = card.bingo[cell].padEnd(5);
  });

  console.log("\nBingo Card Visualization:");
  console.log("---------------------");
  grid.forEach(row => console.log(`| ${row.join(' | ')} |`));
  console.log("---------------------\n");
};

const updateBingoCards = (matchingNFTs, condition) => {
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
      if (cardUpdated) {
        updatedUsers.push(card["X Username:"] || "Unknown");
      }
      const winResult = checkBingoWin(card, condition);
      if (winResult) {
        winner = winResult;
      }
    }
  });
  fs.writeFileSync(bingoCardsPath, JSON.stringify(bingoCards, null, 2), 'utf8');
  return { winner, updatesCount, updatedUsers };
};

const loopUntilWinner = (condition, delay) => {
  const runIteration = () => {
    const randomTrait = getRandomTrait();
    const matchingNFTs = findMatchingNFTs(randomTrait);
    const { winner, updatesCount, updatedUsers } = updateBingoCards(matchingNFTs, condition);
    
    console.log("\n--------------------------------------------------");
    console.log(`Trait group: ${randomTrait.trait_type}, Trait: ${randomTrait.value}, Total Updates Made: ${updatesCount}`);
    console.log(`Updated Users: ${updatedUsers.join(', ') || 'None'}`);
    console.log("--------------------------------------------------\n");
    
    if (winner) {
      console.log("\n--------------------------------------------------");
      console.log("We have a winner!");
      console.log(`Bingo! Condition: ${winner.condition}, X Username: ${winner.winnerInfo["X Username:"]}, Wallet: ${winner.winnerInfo["ETH/Base wallet for prizes:"]}, Winning Cells: ${winner.winningCells.join(', ')}`);
      console.log("--------------------------------------------------\n");
      visualizeBingoCard(winner.winnerInfo, winner.winningCells);
    } else {
      setTimeout(runIteration, delay);
    }
  };

  runIteration();
};

const conditionToCheck = process.argv[2] || "5INAROW";
const delay = parseInt(process.argv[3]) || 2000; // Default to 2000ms (2 seconds) if no input is provided
loopUntilWinner(conditionToCheck, delay);