// File: index.js (Backend - Full Code)

const express = require('express')
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express();
const cors = require('cors');
const port = process.env.PORT || 9000;

// Middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7tyfnet.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Database and Collections
        // const db = client.db('MoodIndexDB');
        const userCollection = client.db('MoodIndexDB').collection('users');
        const assessmentCollection = client.db('MoodIndexDB').collection('assessments');
        const contactedCollection = client.db('MoodIndexDB').collection('contactedUser');

        // Connect the client to the server
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");



        app.patch('/users/:email', async (req, res) => {
            try {
                const email = req.params.email;
                const updateFields = req.body;

                if (!updateFields || Object.keys(updateFields).length === 0) {
                    return res.status(400).send({ success: false, message: 'No fields provided' });
                }

                const query = { email };
                const updateDoc = { $set: updateFields };
                const result = await userCollection.updateOne(query, updateDoc);

                res.status(200).send({
                    success: true,
                    message: 'User updated successfully',
                    matchedCount: result.matchedCount,
                    modifiedCount: result.modifiedCount,
                });
            } catch (err) {
                console.error(err);
                res.status(500).send({ success: false, message: 'Internal server error' });
            }
        });


        app.get('/users/:email', async (req, res) => {
            try {
                const email = req.params.email;
                const query = { email: email };
                const user = await userCollection.findOne(query);
                if (!user) { return res.status(404).send({ success: false, message: 'User not found in database.' }); }
                res.send(user);
            } catch (error) { res.status(500).send({ success: false, message: 'Internal server error.' }); }
        });

        app.post('/users', async (req, res) => {
            const users = req.body
            const result = await userCollection.insertOne(users)
            res.send(result)
        });


        // Delete user by email
        app.delete('/users/:email', async (req, res) => {
            try {
                const email = req.params.email;
                const result = await userCollection.deleteOne({ email });
                if (result.deletedCount === 0)
                    return res.status(404).send({ success: false, message: 'User not found' });
                res.send({ success: true, message: 'User deleted successfully' });
            } catch (error) {
                console.error(error);
                res.status(500).send({ success: false, message: 'Failed to delete user' });
            }
        });

        app.post('/results', async (req, res) => {
            const resultRecord = req.body;
            const result = await assessmentCollection.insertOne(resultRecord);
            res.send(result);
        });

        app.get('/results/:email', async (req, res) => {
            const email = req.params.email;
            const query = { userEmail: email };
            const results = await assessmentCollection.find(query).sort({ timestamp: -1 }).toArray();
            res.send(results);
        });

        //   contact data show 
        app.get('/messages', async (req, res) => {
            const result = await contactedCollection.find().toArray();
            res.send(result);
        });


        // contact data receive from client side visitor
        app.post('/contactedUser', async (req, res) => {
            const contactedUser = req.body
            console.log(contactedUser)
            const result = await contactedCollection.insertOne(contactedUser)
            res.send(result)
        });

    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close(); 
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Welcome To Mood Index platform! ')
})

app.listen(port, () => {
    console.log(`MoodIndex is running on port ${port}`)
})