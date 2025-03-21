const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const results = [];

// Convert survey .csv to .json for easier parsing
fs.createReadStream(path.join(__dirname, 'RegenBingoSurvey.csv')) // Replace 'data.csv' with your CSV file name
  .pipe(csv())
  .on('data', (data) => {
    const bingoAttributes = {};
    const otherAttributes = {};
    
    // Separate attributes into bingo-related and others
    for (const key in data) {
      if (/^R[1-5],/.test(key)) {
        bingoAttributes[key] = data[key];
      } else {
        otherAttributes[key] = data[key];
      }
    }
    
    // Ensure "R3,C3" exists between "R3,C2" and "R3,C4"
    if (bingoAttributes["R3,C2"] !== undefined && bingoAttributes["R3,C4"] !== undefined && bingoAttributes["R3,C3"] === undefined) {
      bingoAttributes["R3,C3"] = "HIT"; // Set a default value
    }
    
    results.push({ ...otherAttributes, bingo: bingoAttributes });
  })
  .on('end', () => {
    fs.writeFile('BingoCards.json', JSON.stringify(results, null, 2), (err) => {
      if (err) {
        console.error('Error writing JSON file:', err);
      } else {
        console.log('CSV successfully converted to JSON and saved as BingoCards.json');
      }
    });
  });
