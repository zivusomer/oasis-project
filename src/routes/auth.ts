import { Router, Request, Response } from 'express';
import { AsyncRouteAdapter } from '../middleware/asyncRoute';
import { AuthController } from '../controllers/authController';
import { ApiOverviewEntry } from '../interfaces/http';

export class AuthRoutes {
  private router: Router;

  constructor(
    private authController: AuthController,
    private asyncRouteAdapter: AsyncRouteAdapter
  ) {
    this.router = Router();
    this.registerRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  public getApiOverview(): ApiOverviewEntry[] {
    return [
      {
        method: 'POST',
        path: '/login',
        description: 'Login with Jira credentials',
      },
    ];
  }

  private registerRoutes(): void {
    this.router.post(
      '/login',
      this.asyncRouteAdapter.wrap(async (req: Request, res: Response) =>
        this.authController.login(req, res)
      )
    );
  }
}
