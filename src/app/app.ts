import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PageFooter } from './shared/layout/page-footer/page-footer';
import { PageHeader } from './shared/layout/page-header/page-header';

/**
 * The application shell: the frame every page is rendered inside.
 *
 * <p>Holds the top bar, the region the router fills, and the footer — and nothing else. Pages
 * bring their own content and their own view-models; the shell only decides where they go.</p>
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PageHeader, PageFooter],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
