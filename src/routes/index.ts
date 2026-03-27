import { Express, Router } from 'express';
import auth, { apiOverview as authOverview } from './auth';
import tickets, { apiOverview as ticketsOverview } from './tickets';

export type ApiOverviewEntry = { method: string; path: string; description: string };

const apiList: { prefix: string; router: Router; overview: ApiOverviewEntry[] }[] = [
  { prefix: '/auth', router: auth, overview: authOverview },
  { prefix: '/tickets', router: tickets, overview: ticketsOverview },
];

function buildEndpoints(baseUrl: string): { method: string; url: string }[] {
  const endpoints: { method: string; url: string }[] = [];
  for (const { prefix, overview } of apiList) {
    for (const { method, path } of overview) {
      const fullPath = prefix + (path === '/' ? '' : path);
      endpoints.push({ method, url: `${baseUrl}${fullPath}` });
    }
  }
  return endpoints;
}

const router = Router();

router.get('/', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host') || ''}`;
  res.json({
    message: 'Welcome to the API',
    endpoints: buildEndpoints(baseUrl),
  });
});

for (const { prefix, router: r } of apiList) {
  router.use(prefix, r);
}

export function mountRoutes(app: Express): void {
  app.use(router);
}
