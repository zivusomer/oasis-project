import express, { Request, Response } from 'express';
import { mountRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';

export class AppFactory {
  public createApp() {
    const app = express();

    app.use(express.json());
    mountRoutes(app);

    app.use((req: Request, res: Response) => {
      res.status(404).json({ error: 'Not found', path: req.path });
    });

    app.use(errorHandler);
    return app;
  }
}

const appFactory = new AppFactory();
const app = appFactory.createApp();
export default app;
