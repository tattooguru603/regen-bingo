const fs = require('fs');

// Read the JSON file
const inputPath = 'AllRegenData.json';
const outputPath = 'UniqueRegenTraits.json';

const rawData = fs.readFileSync(inputPath, 'utf8');
const nftData = JSON.parse(rawData);

// Use a Set to store unique trait_type and value pairs
const uniqueTraits = new Set();

nftData.forEach(nft => {
  if (nft.traits) {
    nft.traits.forEach(trait => {
      uniqueTraits.add(JSON.stringify({ trait_type: trait.trait_type, value: trait.value }));
    });
  }
});

// Convert Set to Array
const uniqueTraitsArray = Array.from(uniqueTraits).map(item => JSON.parse(item));

// Write to JSON file
fs.writeFileSync(outputPath, JSON.stringify(uniqueTraitsArray, null, 2));

console.log(`Extracted ${uniqueTraitsArray.length} unique trait combinations and saved to ${outputPath}`);
