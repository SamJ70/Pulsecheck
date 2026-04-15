require('dotenv').config();
const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');

const searchRouter = require('./routes/search');
const trendingRouter = require('./routes/trending');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/search', searchRouter);
app.use('/api/trending', trendingRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`PulseCheck backend running on port ${PORT}`));