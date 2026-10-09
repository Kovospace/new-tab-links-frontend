import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/** Where the generated list of image versions is served from; it ships in {@code public/content}. */
const IMAGE_VERSIONS_URL = '/content/image-versions.json';

/**
 * A short hash of every image's content, by its path below {@code public/} with no leading slash —
 * {@code images/sk/demo/3_1x.webp}, {@code flags/sk-48.png}.
 *
 * <p>Generated at build time by {@code scripts/build-image-versions.mjs}.</p>
 */
export type ImageVersions = Readonly<Partial<Record<string, string>>>;

/**
 * Turns the address of one of this site's images into the address of its current version.
 *
 * <p>A function type rather than the store itself, so the plain functions that build image
 * addresses — the markdown renderer, the srcset builders — can be handed it without depending on
 * Angular's injector.</p>
 */
export type ImageUrlVersioner = (imageUrl: string) => string;

/** Query parameter carrying an image's content hash. */
const VERSION_PARAMETER = 'v';

/**
 * Keeps a replaced image from being shown from a browser's cache.
 *
 * <p>Images keep their names when they change — a re-shot demo slide is still {@code 3_1x.webp} —
 * and nginx lets a browser keep an image for a week without asking again. So a visitor who had
 * seen the old picture went on seeing it. Every image address the site builds therefore carries
 * the hash of the file's content, {@code ?v=9f2c4e1a7b}: a changed picture has a new address,
 * which nothing cached can answer, and an unchanged one keeps its address across releases.</p>
 *
 * <p>Loaded once, before the first render, like the translations, so the address in the
 * pre-rendered HTML is the one the browser keeps after hydration. A list that fails to load leaves
 * every address as it was: an image that may be a week out of date beats one that is missing.</p>
 */
@Injectable({ providedIn: 'root' })
export class ImageVersionStore {
  private readonly httpClient = inject(HttpClient);

  /** The versions as loaded; empty until they arrive, and if they never do. */
  private readonly loadedImageVersions = signal<ImageVersions>({});

  /**
   * Fetches the list of image versions.
   *
   * @returns a promise that settles once the list is in place, or known to be unavailable
   */
  async loadImageVersions(): Promise<void> {
    try {
      this.loadedImageVersions.set(
        await firstValueFrom(this.httpClient.get<ImageVersions>(IMAGE_VERSIONS_URL)),
      );
    } catch {
      this.loadedImageVersions.set({});
    }
  }

  /**
   * Appends the content hash to one image's address.
   *
   * <p>An arrow function, so it can be passed on as an {@link ImageUrlVersioner} unbound. The
   * address may be relative ({@code images/sk/…}) or from the root ({@code /images/sk/…}); either
   * keeps its form. An address the list does not know — a full URL, one that already carries a
   * query, a file added since the build — is returned unchanged.</p>
   *
   * @param imageUrl the image's address
   * @returns the address of its current version
   */
  readonly versionImageUrl: ImageUrlVersioner = (imageUrl) => {
    const version = this.loadedImageVersions()[imageUrl.replace(/^\/+/, '')];
    return version === undefined ? imageUrl : `${imageUrl}?${VERSION_PARAMETER}=${version}`;
  };
}
