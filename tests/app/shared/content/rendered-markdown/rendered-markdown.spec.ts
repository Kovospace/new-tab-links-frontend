import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { RenderedMarkdown } from '@app/shared/content/rendered-markdown/rendered-markdown';

/**
 * The markdown's HTML lands directly in the host, under the class its stylesheet is scoped to.
 */
describe('RenderedMarkdown', () => {
  it('puts the HTML inside itself, marked with the class its styles hang on', () => {
    const fixture = TestBed.createComponent(RenderedMarkdown);
    fixture.componentRef.setInput('html', '<ul><li><strong>One</strong></li></ul>');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.classList).toContain('rendered-markdown');
    expect(host.querySelector(':scope > ul > li > strong')?.textContent).toBe('One');
  });

  it('drops a script rather than running it', () => {
    const fixture = TestBed.createComponent(RenderedMarkdown);
    fixture.componentRef.setInput('html', '<p>Text</p><script>alert(1)</script>');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('script')).toBeNull();
  });
});
