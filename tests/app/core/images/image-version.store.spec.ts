import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ImageVersionStore } from '@app/core/images/image-version.store';

/**
 * Image addresses carry their file's content hash, so a replaced image is never shown from cache.
 */
describe('ImageVersionStore', () => {
  let httpTestingController: HttpTestingController;
  let imageVersionStore: ImageVersionStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpTestingController = TestBed.inject(HttpTestingController);
    imageVersionStore = TestBed.inject(ImageVersionStore);
  });

  afterEach(() => httpTestingController.verify());

  /**
   * Loads the given list as the generated file would serve it.
   *
   * @param imageVersions the versions by path below {@code public/}
   */
  async function loadImageVersions(imageVersions: Record<string, string>): Promise<void> {
    const loading = imageVersionStore.loadImageVersions();
    httpTestingController.expectOne('/content/image-versions.json').flush(imageVersions);
    await loading;
  }

  it('appends the version to a relative address and to one from the root alike', async () => {
    await loadImageVersions({ 'images/sk/demo/3_1x.webp': '9f2c4e1a7b' });

    expect(imageVersionStore.versionImageUrl('images/sk/demo/3_1x.webp')).toBe(
      'images/sk/demo/3_1x.webp?v=9f2c4e1a7b',
    );
    expect(imageVersionStore.versionImageUrl('/images/sk/demo/3_1x.webp')).toBe(
      '/images/sk/demo/3_1x.webp?v=9f2c4e1a7b',
    );
  });

  it('leaves an address the list does not know as it is', async () => {
    await loadImageVersions({ 'images/sk/demo/3_1x.webp': '9f2c4e1a7b' });

    expect(imageVersionStore.versionImageUrl('/images/sk/demo/4_1x.webp')).toBe(
      '/images/sk/demo/4_1x.webp',
    );
    expect(imageVersionStore.versionImageUrl('https://example.com/3_1x.webp')).toBe(
      'https://example.com/3_1x.webp',
    );
  });

  it('leaves every address as it is when the list cannot be loaded', async () => {
    const loading = imageVersionStore.loadImageVersions();
    httpTestingController
      .expectOne('/content/image-versions.json')
      .flush('', { status: 404, statusText: 'Not Found' });
    await loading;

    expect(imageVersionStore.versionImageUrl('/flags/sk-48.png')).toBe('/flags/sk-48.png');
  });

  it('works passed on unbound, as the markdown renderer and the srcset builders receive it', async () => {
    await loadImageVersions({ 'flags/sk-48.png': '04d1be93c2' });
    const { versionImageUrl } = imageVersionStore;

    expect(versionImageUrl('/flags/sk-48.png')).toBe('/flags/sk-48.png?v=04d1be93c2');
  });
});
