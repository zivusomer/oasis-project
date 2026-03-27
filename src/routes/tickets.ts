import { Router, Request, Response } from 'express';
import { AsyncRouteAdapter } from '../middleware/asyncRoute';
import { AuthGuard } from '../middleware/authGuard';
import { TicketsController } from '../controllers/ticketsController';
import { ApiOverviewEntry } from '../interfaces/http';

export class TicketsRoutes {
  private router: Router;

  constructor(
    private ticketsController: TicketsController,
    private authGuard: AuthGuard,
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
