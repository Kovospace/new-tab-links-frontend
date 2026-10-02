import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { serverApplicationConfiguration } from './app/app.config.server';

/**
 * Starts the application to render one page at build time.
 *
 * <p>Only the build runs this: the image serves the rendered files with nginx and has no Node to run
 * it in. See {@code app.routes.server.ts} for which pages are rendered.</p>
 *
 * @param context the render the build is performing
 * @returns the started application, which the build serialises to HTML
 */
const bootstrap = (context: BootstrapContext) =>
  bootstrapApplication(App, serverApplicationConfiguration, context);

export default bootstrap;
