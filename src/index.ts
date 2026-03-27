import { AppFactory } from './app';
import { AppContainer } from './container/AppContainer';
import { Startup } from './startup';

const PORT = process.env.PORT || 3000;

export class ApplicationRunner {
  private startup: Startup;
  private appContainer: AppContainer;
  private appFactory: AppFactory;

  constructor() {
    this.startup = new Startup();
    this.appContainer = new AppContainer();
    this.appFactory = new AppFactory();
  }

  public async run(): Promise<void> {
    this.registerProcessGuards();
    await this.startup.run();
    const app = this.appFactory.createApp(this.appContainer.getApiRouterRegistry());
    const server = app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(
          `Port ${PORT} is already in use. Stop the other process or use PORT=3001 npm start`
        );
      } else {
        console.error(err);
      }
      process.exit(1);
    });
  }

  private registerProcessGuards(): void {
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled promise rejection:', reason);
      process.exit(1);
    });
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      process.exit(1);
    });
  }
}

const runner = new ApplicationRunner();
runner.run().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
