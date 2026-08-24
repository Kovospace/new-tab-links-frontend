import { TestBed } from '@angular/core/testing';
import { App } from './app';

/**
 * Verifies that the root component boots and renders the hello-world placeholder page.
 */
describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the hello world greeting', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const renderedPage = fixture.nativeElement as HTMLElement;
    expect(renderedPage.querySelector('h1')?.textContent).toContain('Hello World');
  });
});
