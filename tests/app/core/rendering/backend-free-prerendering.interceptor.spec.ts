import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  DEFAULT_RUNTIME_CONFIGURATION,
  RUNTIME_CONFIGURATION,
} from '@app/core/config/runtime-configuration';
import { backendFreePrerenderingInterceptor } from '@app/core/rendering/backend-free-prerendering.interceptor';
import { firstValueFrom } from 'rxjs';

const BACKEND_BASE_URL = 'https://api.example';

function configure(platformId: 'server' | 'browser'): void {
  TestBed.configureTestingModule({
    providers: [
      { provide: PLATFORM_ID, useValue: platformId },
      {
        provide: RUNTIME_CONFIGURATION,
        useValue: { ...DEFAULT_RUNTIME_CONFIGURATION, backendBaseUrl: BACKEND_BASE_URL },
      },
      provideHttpClient(withInterceptors([backendFreePrerenderingInterceptor])),
      provideHttpClientTesting(),
    ],
  });
}

describe('backendFreePrerenderingInterceptor', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('fails a backend call on the server as unreachable, without sending it', async () => {
    configure('server');

    const failure = await firstValueFrom(
      TestBed.inject(HttpClient).get(`${BACKEND_BASE_URL}/api/v1/payments/offers`),
    ).catch((error: unknown) => error);

    expect(failure).toMatchObject({ status: 0 });
  });

  it('lets the site own files through on the server, which the build serves', () => {
    configure('server');

    TestBed.inject(HttpClient).get('i18n/en.json').subscribe();

    TestBed.inject(HttpTestingController).expectOne('i18n/en.json').flush({});
  });

  it('lets backend calls through in the browser', () => {
    configure('browser');

    TestBed.inject(HttpClient).get(`${BACKEND_BASE_URL}/api/v1/payments/offers`).subscribe();

    TestBed.inject(HttpTestingController)
      .expectOne(`${BACKEND_BASE_URL}/api/v1/payments/offers`)
      .flush({});
  });
});
