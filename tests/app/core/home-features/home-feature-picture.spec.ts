import { describe, expect, it } from 'vitest';
import { separateHomeFeaturePicture } from '@app/core/home-features/home-feature-picture';

/** Which image is a point's picture, and what is left as its text. */
describe('separateHomeFeaturePicture', () => {
  it('lifts out a picture written below the title', () => {
    const separated = separateHomeFeaturePicture('# Groups\n\n![Columns](columns.svg)\n\nText.\n');

    expect(separated.pictureMarkdown).toBe('![Columns](columns.svg)');
    expect(separated.textMarkdown).toBe('# Groups\n\nText.\n');
    expect(separated.picturePlacement).toBeNull();
  });

  it('lifts out a picture written above the title, taking its side off the address', () => {
    const separated = separateHomeFeaturePicture('![Columns](columns.svg#right)\n\n# Groups\n');

    expect(separated.pictureMarkdown).toBe('![Columns](columns.svg)');
    expect(separated.textMarkdown).toBe('# Groups\n');
    expect(separated.picturePlacement).toBe('right');
  });

  it('leaves an image inside a sentence, and any image after the picture, in the text', () => {
    const separated = separateHomeFeaturePicture(
      'See ![icon](icon.svg) here.\n\n![First](first.svg)\n\n![Second](second.svg)\n',
    );

    expect(separated.pictureMarkdown).toBe('![First](first.svg)');
    expect(separated.textMarkdown).toContain('![icon](icon.svg)');
    expect(separated.textMarkdown).toContain('![Second](second.svg)');
  });

  it('keeps the whole file as text when there is no picture', () => {
    const separated = separateHomeFeaturePicture('# Groups\n\nText.');

    expect(separated).toEqual({
      pictureMarkdown: '',
      textMarkdown: '# Groups\n\nText.',
      picturePlacement: null,
    });
  });
});
