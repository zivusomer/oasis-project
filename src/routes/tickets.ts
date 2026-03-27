import { Router, Request, Response } from 'express';
import { AsyncRouteAdapter } from '../middleware/asyncRoute';
import { AuthGuard } from '../middleware/requireAuth';
import { TicketsController } from '../controllers/ticketsController';
import { ApiOverviewEntry } from '../interfaces/http';
import { AuthService } from '../services/authService';

export class TicketsRoutes {
  private router: Router;
  private asyncRouteAdapter: AsyncRouteAdapter;
  private authGuard: AuthGuard;
  private ticketsController: TicketsController;

  constructor() {
    this.router = Router();
    this.asyncRouteAdapter = new AsyncRouteAdapter();
    this.authGuard = new AuthGuard(new AuthService());
    this.ticketsController = new TicketsController();
    this.registerRoutes();
  }

  public getRouter(): Router {
    return this.router;
  }

  public getApiOverview(): ApiOverviewEntry[] {
    return [
      { method: 'POST', path: '/', description: 'Create ticket' },
      { method: 'GET', path: '/recent', description: 'Get recent tickets' },
    ];
  }

  private registerRoutes(): void {
    this.router.post(
      '/',
      this.authGuard.requireAuth.bind(this.authGuard),
      this.asyncRouteAdapter.wrap(async (req: Request, res: Response) =>
        this.ticketsController.createTicket(req, res)
      )
    );

    this.router.get(
      '/recent',
      this.authGuard.requireAuth.bind(this.authGuard),
      this.asyncRouteAdapter.wrap(async (req: Request, res: Response) =>
        this.ticketsController.getRecentTickets(req, res)
      )
    );
  }
}

const ticketsRoutes = new TicketsRoutes();
export const ticketsApiOverview = ticketsRoutes.getApiOverview();
export default ticketsRoutes.getRouter();
