import { AuthController } from '../controllers/authController';
import { TicketsController } from '../controllers/ticketsController';
import { AsyncRouteAdapter } from '../middleware/asyncRoute';
import { AuthGuard } from '../middleware/authGuard';
import { AuthRequestContext } from '../middleware/authRequestContext';
import { AuthRoutes } from '../routes/auth';
import { ApiRouterRegistry, RouteRegistration } from '../routes/index';
import { TicketsRoutes } from '../routes/tickets';
import { AuthService } from '../services/authService';
import { CreateTicketService } from '../services/createTicketService';
import { JiraGateway } from '../services/jiraGateway';
import { RecentTicketsService } from '../services/recentTicketsService';

export class AppContainer {
  private authService: AuthService;
  private asyncRouteAdapter: AsyncRouteAdapter;
  private authController: AuthController;
  private ticketsController: TicketsController;
  private createTicketService: CreateTicketService;
  private recentTicketsService: RecentTicketsService;
  private jiraGateway: JiraGateway;
  private authGuard: AuthGuard;
  private authRequestContext: AuthRequestContext;
  private authRoutes: AuthRoutes;
  private ticketsRoutes: TicketsRoutes;
  private apiRouterRegistry: ApiRouterRegistry;

  constructor() {
    this.authService = new AuthService();
    this.asyncRouteAdapter = new AsyncRouteAdapter();
    this.authController = new AuthController(this.authService);
    this.jiraGateway = new JiraGateway();
    this.createTicketService = new CreateTicketService(this.jiraGateway);
    this.recentTicketsService = new RecentTicketsService(this.jiraGateway);
    this.authRequestContext = new AuthRequestContext();
    this.ticketsController = new TicketsController(
      this.createTicketService,
      this.recentTicketsService,
      this.authRequestContext
    );
    this.authGuard = new AuthGuard(this.authService);

    this.authRoutes = new AuthRoutes(this.authController, this.asyncRouteAdapter);
    this.ticketsRoutes = new TicketsRoutes(
      this.ticketsController,
      this.authGuard,
      this.asyncRouteAdapter
    );

    this.apiRouterRegistry = new ApiRouterRegistry(this.getRouteRegistrations());
  }

  public getApiRouterRegistry(): ApiRouterRegistry {
    return this.apiRouterRegistry;
  }

  private getRouteRegistrations(): RouteRegistration[] {
    return [
      {
        prefix: '/auth',
        router: this.authRoutes.getRouter(),
        overview: this.authRoutes.getApiOverview(),
      },
      {
        prefix: '/tickets',
        router: this.ticketsRoutes.getRouter(),
        overview: this.ticketsRoutes.getApiOverview(),
      },
    ];
  }
}
