import express from 'express';

const app = express();
const port = 80;

app.get('/', (req, res) => {
  res.send('Tarqs Crafty Bot is running');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
