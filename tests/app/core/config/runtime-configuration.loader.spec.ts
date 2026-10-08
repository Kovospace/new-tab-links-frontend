import { DEFAULT_RUNTIME_CONFIGURATION } from '@app/core/config/runtime-configuration';
import { loadRuntimeConfiguration } from '@app/core/config/runtime-configuration.loader';

/** Replaces global fetch for one test and hands back what was asked for. */
function stubFetchWith(respond: () => Promise<Response>): void {
  globalThis.fetch = (() => respond()) as typeof fetch;
}

/** Builds a Response carrying the given JSON body. */
function jsonResponse(body: unknown): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

describe('loadRuntimeConfiguration', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('uses the defaults when there is no config.json, so ng serve needs no file', async () => {
    stubFetchWith(() => Promise.resolve(new Response('', { status: 404 })));

    await expect(loadRuntimeConfiguration()).resolves.toEqual(DEFAULT_RUNTIME_CONFIGURATION);
  });

  it('uses the defaults when the file cannot be fetched at all', async () => {
    stubFetchWith(() => Promise.reject(new Error('network down')));

    await expect(loadRuntimeConfiguration()).resolves.toEqual(DEFAULT_RUNTIME_CONFIGURATION);
  });

  it('uses the defaults when the file is not valid JSON', async () => {
    stubFetchWith(() => Promise.resolve(new Response('not json at all', { status: 200 })));

    await expect(loadRuntimeConfiguration()).resolves.toEqual(DEFAULT_RUNTIME_CONFIGURATION);
  });

  it('takes the values the deployment set', async () => {
    stubFetchWith(() =>
      jsonResponse({
        backendBaseUrl: 'https://api.newtablinks.example',
        webClientDeviceName: 'NewTabLinks (production)',
      }),
    );

    const loaded = await loadRuntimeConfiguration();

    expect(loaded.backendBaseUrl).toBe('https://api.newtablinks.example');
    expect(loaded.webClientDeviceName).toBe('NewTabLinks (production)');
  });

  it('keeps the defaults for everything the deployment did not set', async () => {
    stubFetchWith(() => jsonResponse({ backendBaseUrl: 'https://api.newtablinks.example' }));

    const loaded = await loadRuntimeConfiguration();

    expect(loaded.webClientDeviceName).toBe(DEFAULT_RUNTIME_CONFIGURATION.webClientDeviceName);
    expect(loaded.extensionDownload).toEqual(DEFAULT_RUNTIME_CONFIGURATION.extensionDownload);
  });

  it('keeps the defaults of a group the file names without its members', async () => {
    stubFetchWith(() => jsonResponse({ extensionDownload: {} }));

    const loaded = await loadRuntimeConfiguration();

    expect(loaded.extensionDownload).toEqual(DEFAULT_RUNTIME_CONFIGURATION.extensionDownload);
  });
});
