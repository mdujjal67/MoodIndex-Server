const express = require('express')
const app = express();
const cors = require('cors');
const port = process.env.PORT || 9000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Welcome To Mood Index platform! ')
})

app.listen(port, () => {
  console.log(`MoodIndex is running on port ${port}`)
})