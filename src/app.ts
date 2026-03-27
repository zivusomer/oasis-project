import express, { Request, Response } from 'express';
import { ApiRouterRegistry } from './routes';
import { errorHandler } from './middleware/errorHandler';

export class AppFactory {
  public createApp(apiRouterRegistry: ApiRouterRegistry) {
    const app = express();

    app.use(express.json());
    apiRouterRegistry.mountRoutes(app);

    app.use((req: Request, res: Response) => {
      res.status(404).json({ error: 'Not found', path: req.path });
    });

    app.use(errorHandler);
    return app;
  }
}
