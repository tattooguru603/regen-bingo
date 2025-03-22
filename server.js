const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios"); // Import axios for making HTTP requests

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public"))); // Serve static files

// Redirect root to BingoCardEntry.html
app.get("/", (req, res) => {
  res.redirect("/BingoCardEntry.html");
});

// Handle saving Bingo card data remotely
app.post("/save-bingo-card", async (req, res) => {
  const bingoData = req.body; // The Bingo data we receive from the client

  try {
    // Send POST request to JSONBin
    const response = await axios.post("https://api.jsonbin.io/v3/b", bingoData, {
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": process.env.JSONBIN_API_KEY, // Your API Key (stored in .env)
        "X-Bin-Name": "Regen Bingo Cards" // Name for your storage bin (optional)
      }
    });

    res.json({ message: "Bingo card saved remotely!" });
  } catch (err) {
    console.error("Error saving Bingo card:", err.message);
    res.status(500).json({ message: "Failed to save Bingo card." });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
