import express, { Request, Response } from 'express';
import { mountRoutes } from './routes';
import { errorHandler } from './middleware';

const app = express();

app.use(express.json());
mountRoutes(app);

// 404 for any unmatched route (JSON response)
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found', path: _req.path });
});

app.use(errorHandler);

export default app;
