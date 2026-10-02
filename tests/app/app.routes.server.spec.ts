import { RenderMode } from '@angular/ssr';
import { serverRoutes } from '@app/app.routes.server';

describe('serverRoutes', () => {
  const prerenderedPaths = serverRoutes
    .filter((route) => route.renderMode === RenderMode.Prerender)
    .map((route) => route.path);

  it('renders every public page at build time, in every language', () => {
    expect(prerenderedPaths).toEqual(
      expect.arrayContaining(['', 'sk', 'download', 'sk/download', 'privacy', 'sk/privacy']),
    );
  });

  it('renders every tip at build time, in every language', () => {
    expect(prerenderedPaths).toEqual(expect.arrayContaining(['tips/:slug', 'sk/tips/:slug']));
  });

  it('never renders a private page or a mailed address at build time', () => {
    for (const privatePath of ['login', 'account', 'devices', 'activate', 'admin']) {
      expect(prerenderedPaths).not.toContain(privatePath);
    }
  });

  it('leaves everything else to the browser, last, so it catches only what is left', () => {
    expect(serverRoutes.at(-1)).toEqual({ path: '**', renderMode: RenderMode.Client });
  });
});
