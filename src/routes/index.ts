import { Express, Router } from 'express';
import auth, { authApiOverview } from './auth';
import tickets, { ticketsApiOverview } from './tickets';
import { ApiOverviewEntry, EndpointEntry } from '../interfaces/http';

export interface RouteRegistration {
  prefix: string;
  router: Router;
  overview: ApiOverviewEntry[];
}

export class ApiRouterRegistry {
  private apiList: RouteRegistration[];
  private router: Router;

  constructor() {
    this.apiList = [
      { prefix: '/auth', router: auth, overview: authApiOverview },
      { prefix: '/tickets', router: tickets, overview: ticketsApiOverview },
    ];
    this.router = Router();
    this.registerRoutes();
  }

  public mountRoutes(app: Express): void {
    app.use(this.router);
  }

  private registerRoutes(): void {
    this.router.get('/', (req, res) => {
      const baseUrl = `${req.protocol}://${req.get('host') || ''}`;
      res.json({
        message: 'Welcome to the API',
        endpoints: this.buildEndpoints(baseUrl),
      });
    });

    for (const api of this.apiList) {
      this.router.use(api.prefix, api.router);
    }
  }

  private buildEndpoints(baseUrl: string): EndpointEntry[] {
    const endpoints: EndpointEntry[] = [];
    for (const api of this.apiList) {
      for (const endpoint of api.overview) {
        const fullPath = api.prefix + (endpoint.path === '/' ? '' : endpoint.path);
        endpoints.push({ method: endpoint.method, url: `${baseUrl}${fullPath}` });
      }
    }
    return endpoints;
  }
}

const apiRouterRegistry = new ApiRouterRegistry();

export function mountRoutes(app: Express): void {
  apiRouterRegistry.mountRoutes(app);
}
