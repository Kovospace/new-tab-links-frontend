import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Root component of the NewTabLinks frontend.
 *
 * <p>At this stage it only renders the hello-world placeholder page that proves the Angular
 * build, the dev server and the routing setup are wired correctly. The real presentation
 * pages are added by later assignments and will be reached through {@link RouterOutlet}.</p>
 *
 * <p>Per the project's MVVM rule the template contains no data transformation: every value it
 * binds is already presentation-ready when it leaves this class.</p>
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  /**
   * Greeting shown on the placeholder page, presentation-ready as-is.
   *
   * <p>Held in a signal so the template stays reactive once this text is replaced by
   * view-model supplied content.</p>
   */
  protected readonly helloWorldGreeting = signal('Hello World');
}
