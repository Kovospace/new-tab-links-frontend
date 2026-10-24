import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { StructuredDataWriter } from '@app/core/seo/structured-data.writer';

/**
 * A page's JSON-LD is one script in the head, replaced on rewrite and gone once removed.
 */
describe('StructuredDataWriter', () => {
  let document: Document;
  let writer: StructuredDataWriter;

  const scripts = () => document.head.querySelectorAll('script[type="application/ld+json"]');

  beforeEach(() => {
    writer = TestBed.inject(StructuredDataWriter);
    document = TestBed.inject(DOCUMENT);
    writer.remove();
  });

  it('keeps a single script, holding the latest data', () => {
    writer.write({ name: 'first' });
    writer.write({ name: 'second' });

    expect(scripts().length).toBe(1);
    expect(JSON.parse(scripts()[0].textContent ?? '')).toEqual({ name: 'second' });
  });

  it('escapes "<" so that a value cannot close the script early', () => {
    writer.write({ text: '</script><b>' });

    expect(scripts()[0].textContent).not.toContain('</script>');
    expect(JSON.parse(scripts()[0].textContent ?? '')).toEqual({ text: '</script><b>' });
  });

  it('removes the script', () => {
    writer.write({ name: 'gone soon' });
    writer.remove();

    expect(scripts().length).toBe(0);
  });
});
