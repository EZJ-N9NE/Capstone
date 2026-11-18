import express from 'express';
import cors from 'cors';
import eventsRouter from './routes/events.js';
import categoriesRouter from './routes/categories.js';
import geocodeRouter from './routes/geocode.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ data: { status: 'ok' }, meta: {} });
  });

  app.use('/api/events', eventsRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/geocode', geocodeRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
