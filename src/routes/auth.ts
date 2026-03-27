import { Router, Request, Response } from 'express';
import { AsyncRouteAdapter } from '../middleware/asyncRoute';
import { AuthController } from '../controllers/authController';
import { ApiOverviewEntry } from '../interfaces/http';
import { AuthService } from '../services/authService';

export class AuthRoutes {
  private router: Router;
  private asyncRouteAdapter: AsyncRouteAdapter;
  private authController: AuthController;

  constructor() {
    this.router = Router();
    this.asyncRouteAdapter = new AsyncRouteAdapter();
    this.authController = new AuthController(new AuthService());
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

const authRoutes = new AuthRoutes();
export const authApiOverview = authRoutes.getApiOverview();
export default authRoutes.getRouter();
