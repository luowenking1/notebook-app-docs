import { createApp } from './app';

const app = createApp();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Notebook API server listening on port ${PORT}`);
});
