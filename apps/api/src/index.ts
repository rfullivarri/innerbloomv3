import dotenv from 'dotenv';
import { createApp } from './app';
import { dbReady } from './db/client';

dotenv.config();

export const app = createApp();

const port = Number(process.env.PORT ?? 3000);

if (require.main === module) {
  dbReady
    .then(() => {
      app.listen(port, () => {
        console.log(`API listening on port ${port}`);
      });
    })
    .catch((error) => {
      console.error('Unable to start server because the database is sad', error);
      process.exit(1);
    });
}
