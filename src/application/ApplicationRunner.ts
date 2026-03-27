import { AppFactory } from '../app';
import { AppConstants } from '../constants/AppConstants';
import { ProcessEventNames } from '../constants/ProcessEventNames';
import { AppContainer } from '../container/AppContainer';
import { Startup } from '../startup';

export class ApplicationRunner {
  private startup: Startup;
  private appContainer: AppContainer;
  private appFactory: AppFactory;
  private readonly port: number = Number(process.env.PORT) || AppConstants.DEFAULT_PORT;

  constructor() {
    this.startup = new Startup();
    this.appContainer = new AppContainer();
    this.appFactory = new AppFactory();
  }

  public async run(): Promise<void> {
    this.registerProcessGuards();
    await this.startup.run();
    const app = this.appFactory.createApp(this.appContainer.getApiRouterRegistry());
    const server = app.listen(this.port, () => {
      console.log(`Server running at http://localhost:${this.port}`);
    });
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === AppConstants.PORT_IN_USE_CODE) {
        console.error(
          `Port ${this.port} is already in use. Stop the other process or use PORT=${AppConstants.PORT_IN_USE_FALLBACK} npm start`
        );
      } else {
        console.error(err);
      }
      process.exit(1);
    });
  }

  private registerProcessGuards(): void {
    process.on(ProcessEventNames.UNHANDLED_REJECTION, (reason) => {
      console.error('Unhandled promise rejection:', reason);
      process.exit(1);
    });
    process.on(ProcessEventNames.UNCAUGHT_EXCEPTION, (error) => {
      console.error('Uncaught exception:', error);
      process.exit(1);
    });
  }
}
