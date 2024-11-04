const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
const dbName = 'threejs';

app.use(cors());
app.use(express.json());

async function main() {
    await client.connect();
    console.log('Connected successfully to MongoDB');
    const db = client.db(dbName);
    const collection = db.collection('threejs');

    // API endpoint to add a bot position
    app.post('/add', async (req, res) => {
        // Destructure the name, x, and z from the request body
        const { name, x, z } = req.body; 
    
        // Log to check the values received
        console.log(`Bot Name: ${name}, X: ${x}, Z: ${z}`); // Log the bot name 
    
        try {
            // Insert or update the bot's position
            const result = await collection.updateOne(
                { name: name }, // Filter by bot name
                { $addToSet: { positions: { x, z } } }, // Add to positions array (if not already present)
                { upsert: true } // Create a new document if no document matches
            );
    
            res.json({ message: "Position added successfully", result });
            console.log("Successfully added position for bot:", name);
        } catch (error) {
            console.error('Error adding bot position:', error);
            res.status(500).json({ error: 'Failed to add bot position' });
        }
    });
    
    
    

    app.get('/bot/:name', async (req, res) => {
        const { name } = req.params;
        console.log(`Fetching positions for bot: ${name}`); // Log the bot name
    
        try {
            const botData = await collection.findOne({ name: name });
            console.log('Bot data:', botData); // Log the retrieved data
    
            if (!botData) {
                return res.status(404).json({ error: 'Bot not found' });
            }
    
            res.json(botData.positions); // Send only the positions
        } catch (error) {
            console.error('Error fetching bot positions:', error);
            res.status(500).json({ error: 'Failed to fetch bot positions' });
        }
    });
    



    // Start the server
    app.listen(3000, () => {
        console.log('Server is running on http://localhost:3000');
    });
}

main().catch(console.error);
