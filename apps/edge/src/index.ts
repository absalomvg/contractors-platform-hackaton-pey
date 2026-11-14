import { Container, getContainer } from '@cloudflare/containers';

interface Env {
  ASSETS: Fetcher;
  BACKEND: DurableObjectNamespace<Backend>;
}

export class Backend extends Container<Env> {
  defaultPort = 8080;
  sleepAfter = '15m';
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      // Route requests to the same container while the repository is in memory.
      return getContainer(env.BACKEND).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
