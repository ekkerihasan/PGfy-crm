import { config } from './config';
import { createApp } from './app';

createApp().listen(config.port, () => {
  console.log(`PGfy CRM API listening on http://localhost:${config.port}`);
});
