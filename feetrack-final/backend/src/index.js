require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Allow all origins - fixes the login issue
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json());

// Routes
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/students',    require('./routes/students'));
app.use('/api/payments',    require('./routes/payments'));
app.use('/api/concessions', require('./routes/concessions'));
app.use('/api/plans',       require('./routes/plans'));
app.use('/api',             require('./routes/misc'));

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`FeeTrack API running on port ${PORT}`));
