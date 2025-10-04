import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import apiRouter from './routes/apiRoutes.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', apiRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 8080;

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
