import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthenticationSessionStore } from './authentication-session.store';

/**
 * Keeps the signed-in pages out of reach of anonymous visitors.
 *
 * <p>Only a first line: the backend refuses every one of those calls without a valid token
 * regardless. This exists so the visitor meets the login page instead of an empty page full of
 * failed requests.</p>
 *
 * @returns true when a session exists, otherwise a redirect to the login page
 */
export const requiresSignedInUser: CanActivateFn = (_route, state) => {
  const sessionStore = inject(AuthenticationSessionStore);
  const router = inject(Router);

  return (
    sessionStore.isSignedIn() ||
    router.createUrlTree(['/login'], { queryParams: { returnTo: state.url } })
  );
};

/**
 * Keeps the sign-in pages away from someone already signed in.
 *
 * <p>Landing on the login form while holding a session is confusing, so such a visitor is sent
 * to their devices page instead.</p>
 *
 * @returns true when nobody is signed in, otherwise a redirect to the devices page
 */
export const requiresAnonymousVisitor: CanActivateFn = () => {
  const sessionStore = inject(AuthenticationSessionStore);
  const router = inject(Router);

  return !sessionStore.isSignedIn() || router.createUrlTree(['/devices']);
};
