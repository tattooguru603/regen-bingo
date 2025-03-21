const fs = require('fs');
//const fetch = require('node-fetch');

const options = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    'x-api-key': '24dbd7a531574309b7362c5526ba3cad'
  }
};

const outputPath = 'AllRegenData.json';
let nftData = [];

// Load existing data if file exists
if (fs.existsSync(outputPath)) {
  try {
    const rawData = fs.readFileSync(outputPath, 'utf8');
    nftData = JSON.parse(rawData);
  } catch (err) {
    console.error("Error loading existing data, starting fresh.", err);
  }
}

const existingIds = new Set(nftData.map(nft => nft.nftId));

const fetchNFT = async (nftId) => {
  if (existingIds.has(nftId)) {
    console.log(`NFT ${nftId} already exists, skipping...`);
    return;
  }

  try {
    console.log(`Fetching NFT ${nftId}...`);
    let res, data;
    let retryCount = 0;
    
    while (retryCount < 10) {
      res = await fetch(`https://api.opensea.io/api/v2/chain/base/contract/0x56dfe6ae26bf3043dc8fdf33bf739b4ff4b3bc4a/nfts/${nftId}`, options);
      data = await res.json();
      
      const isThrottled = data.detail === "Request was throttled.";
      const hasEmptyFields = !data.nft || !Array.isArray(data.nft.traits) || data.nft.traits.length === 0 || !Array.isArray(data.nft.owners) || data.nft.owners.length === 0;
      
      if (isThrottled || hasEmptyFields) {
        retryCount++;
        console.warn(`Throttled or empty data detected! Attempt ${retryCount}/10. Waiting 65 seconds before retrying NFT ${nftId}...`);
        await new Promise(resolve => setTimeout(resolve, 65000));
      } else {
        break;
      }
    }
    
    if (retryCount === 10) {
      console.error(`NFT ${nftId} failed after 10 retries. Exiting...`);
      process.exit(1);
    }
    
    // Extract only nftId, data.nft.traits (filtered for trait_type and value), and data.nft.owners
    const filteredData = {
      nftId,
      traits: data.nft?.traits?.map(({ trait_type, value }) => ({ trait_type, value })) || [],
      owners: data.nft?.owners || []
    };
    
    nftData.push(filteredData);
    fs.writeFileSync(outputPath, JSON.stringify(nftData, null, 2));
    console.log(`NFT ${nftId} saved to ${outputPath}.`);
  } catch (err) {
    console.error(`Fetch error for NFT ${nftId}:`, err);
  }
};

const fetchAllNFTs = async () => {
  for (let nftId = 3284; nftId <= 6666; nftId++) {
    await fetchNFT(nftId);
  }
  console.log('All NFTs fetched and saved.');
};

fetchAllNFTs();