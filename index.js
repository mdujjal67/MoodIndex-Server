const express = require('express')
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express();
const cors = require('cors');
const port = process.env.PORT || 9000;

// Middleware
const corsOptions = {
    origin: ['http://localhost:5173',
        'https://moodindex-sort.web.app',
        'https://moodindex-sort.firebaseapp.com'],
    credentials: true
}
app.use(cors(corsOptions));
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7tyfnet.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
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

        // ⭐️ NEW: Upsert Route (Handles Google Login & Registration)
        app.put('/users/:email', async (req, res) => {
            try {
                const email = req.params.email;
                const user = req.body;
                const query = { email: email };
                const options = { upsert: true }; // This is the magic: Create if doesn't exist

                const updateDoc = {
                    $set: {
                        name: user.name,
                        email: user.email,
                        photoURL: user.photoURL,
                        // Only set role if it's a new user to prevent overwriting admins
                        ...(user.role && { role: user.role })
                    },
                };

                const result = await userCollection.updateOne(query, updateDoc, options);
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: "Failed to sync user" });
            }
        });


        // This method is replace via app.put('/users')
        // app.post('/users', async (req, res) => {
        //     const users = req.body
        //     const result = await userCollection.insertOne(users)
        //     res.send(result)
        // });


        // Delete user AND all associated assessment results by email
        app.delete('/users/:email', async (req, res) => {
            try {
                const email = req.params.email;

                // 1. Delete all assessment records linked to this email
                await assessmentCollection.deleteMany({ userEmail: email });

                // 2. Delete the user from the user collection
                const result = await userCollection.deleteOne({ email });

                if (result.deletedCount === 0) {
                    return res.status(404).send({ success: false, message: 'User not found' });
                }

                res.send({
                    success: true,
                    message: 'User and all associated assessment data deleted successfully'
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ success: false, message: 'Failed to delete user and their data' });
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

        app.get('/env-test', (req, res) => {
            res.send({
                user: !!process.env.DB_USER,
                pass: !!process.env.DB_PASS
            });
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
});

// / At the very bottom of index.js, add this:
module.exports = app;