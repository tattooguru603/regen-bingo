const fs = require('fs');

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
  ).map(nft => nft.nftId.toString()); // Ensure IDs are strings for comparison
};

const checkBingoWin = (card) => {
  const size = 5; // Bingo board is 5x5
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
  if (diag1 === size) {
    winningCells = Array.from({ length: size }, (_, idx) => `R${idx + 1},C${idx + 1}`);
  } else if (diag2 === size) {
    winningCells = Array.from({ length: size }, (_, idx) => `R${idx + 1},C${size - idx}`);
  }

  return winningCells.length > 0 ? winningCells : null;
};

const updateBingoCards = (matchingNFTs) => {
  let updatesCount = 0;
  bingoCards.forEach(card => {
    if (card.bingo) {
      Object.entries(card.bingo).forEach(([key, value]) => {
        if (matchingNFTs.includes(value.toString()) && !value.endsWith('-HIT')) {
          card.bingo[key] = `${value}-HIT`;
          updatesCount++;
        }
      });
      const winningCells = checkBingoWin(card);
      if (winningCells) {
        console.log(`Bingo! A card has won! X Username: ${card["X Username:"]}, Wallet: ${card["ETH/Base wallet for prizes:"]}, Winning Cells: ${winningCells.join(', ')}`);
      }
    }
  });
  fs.writeFileSync(bingoCardsPath, JSON.stringify(bingoCards, null, 2), 'utf8');
  console.log(`BingoCards.json updated successfully. Total updates made: ${updatesCount}`);
};

const runSearch = () => {
  const randomTrait = getRandomTrait();
  const matchingNFTs = findMatchingNFTs(randomTrait);

  console.log(`Trait group: ${randomTrait.trait_type}, Trait: ${randomTrait.value}, Total Matches: ${matchingNFTs.length}, Matching NFT IDs: ${matchingNFTs.length ? matchingNFTs.join(', ') : 'None'}`);

  updateBingoCards(matchingNFTs);
};

runSearch();