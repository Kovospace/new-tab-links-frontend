import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RUNTIME_CONFIGURATION } from '@app/core/config/runtime-configuration';
import { AdminSessionStore } from '@app/core/admin/admin-session.store';
import { AdminUserService } from '@app/core/admin/admin-user.service';

/** A deployment pointing at a real backend. */
const DEPLOYED_CONFIGURATION = {
  backendBaseUrl: 'https://api.newtablinks.example',
  webClientDeviceName: 'NewTabLinks (production)',
  frontendApiKey: 'the-shared-frontend-key',
  usernameCheckDebounceMilliseconds: 250,
  extensionDownload: { chromeWebStoreUrl: '', selfHostedCrxPath: '' },
};

describe('AdminUserService', () => {
  let httpTestingController: HttpTestingController;
  let adminUserService: AdminUserService;

  beforeEach(() => {
    globalThis.sessionStorage?.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RUNTIME_CONFIGURATION, useValue: DEPLOYED_CONFIGURATION },
      ],
    });

    httpTestingController = TestBed.inject(HttpTestingController);
    TestBed.inject(AdminSessionStore).startSession({
      accessToken: 'an-admin-token',
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    });
    adminUserService = TestBed.inject(AdminUserService);
  });

  afterEach(() => {
    httpTestingController.verify();
    globalThis.sessionStorage?.clear();
  });

  it("sends the operator's own token, not the signed-in user's", () => {
    adminUserService.listAccounts('', 0, 25).subscribe();

    const sentRequest = httpTestingController.expectOne((request) =>
      request.url.endsWith('/api/v1/admin/users'),
    );
    // The interceptor is told to keep out, and the header is built here, so a user session on the
    // same machine can never be the thing that authorises an admin call.
    expect(sentRequest.request.headers.get('Authorization')).toBe('Bearer an-admin-token');
    sentRequest.flush({ users: [], page: 0, size: 25, totalUsers: 0, totalPages: 0 });
  });

  it('passes the search and paging on as query parameters', () => {
    adminUserService.listAccounts('kovo', 2, 50).subscribe();

    const sentRequest = httpTestingController.expectOne((request) =>
      request.url.endsWith('/api/v1/admin/users'),
    );
    expect(sentRequest.request.params.get('query')).toBe('kovo');
    expect(sentRequest.request.params.get('page')).toBe('2');
    expect(sentRequest.request.params.get('size')).toBe('50');
    sentRequest.flush({ users: [], page: 2, size: 50, totalUsers: 0, totalPages: 0 });
  });

  it('deletes one account by identifier', () => {
    adminUserService.deleteAccount('a1b2c3').subscribe();

    const sentRequest = httpTestingController.expectOne((request) =>
      request.url.endsWith('/api/v1/admin/users/a1b2c3'),
    );
    expect(sentRequest.request.method).toBe('DELETE');
    expect(sentRequest.request.headers.get('Authorization')).toBe('Bearer an-admin-token');
    sentRequest.flush(null);
  });

  it('sends null rather than an empty password when the operator removes one', () => {
    adminUserService.setPassword('a1b2c3', '').subscribe();

    const sentRequest = httpTestingController.expectOne((request) =>
      request.url.endsWith('/api/v1/admin/users/a1b2c3/password'),
    );
    expect(sentRequest.request.body).toEqual({ password: null });
    sentRequest.flush({});
  });
});
