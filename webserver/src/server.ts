import express from 'express';
import path from 'path';

const app = express();
const port = 3000;

// Serve static files from the React app's build folder (inside webserver/client)
app.use(express.static(path.join(__dirname, '../dist/client/build')));

// API endpoint example
app.get('/api/status', (req, res) => {
  res.json({ status: 'Tarqs Crafty Bot is running' });
});

// Catch-all handler for React's client-side routing (for React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
