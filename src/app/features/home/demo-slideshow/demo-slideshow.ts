import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { DemoSlideshowViewModel } from './demo-slideshow.view-model';

/**
 * The screenshots of the extension on the home page, changing every ten seconds, with a dot per
 * screenshot to pick one by hand.
 */
@Component({
  selector: 'app-demo-slideshow',
  providers: [DemoSlideshowViewModel],
  templateUrl: './demo-slideshow.html',
  styleUrl: './demo-slideshow.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoSlideshow implements OnInit {
  /** State of the slideshow. */
  protected readonly viewModel = inject(DemoSlideshowViewModel);

  /**
   * Loads the screenshots and starts the slideshow.
   */
  ngOnInit(): void {
    this.viewModel.startSlideshow();
  }
}
