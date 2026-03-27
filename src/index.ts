import { ApplicationRunner } from './application/ApplicationRunner';

const runner = new ApplicationRunner();
runner.run().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
