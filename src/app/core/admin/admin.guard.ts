import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminSessionStore } from './admin-session.store';

/**
 * Keeps the operator pages out of reach without an operator session.
 *
 * <p>Only a first line, exactly like the user guards: the backend refuses every admin call
 * without the admin authority regardless. This exists so an operator whose short session has
 * expired meets the sign-in form rather than a page of failed requests.</p>
 *
 * @returns true when an operator session exists, otherwise a redirect to the admin sign-in
 */
export const requiresAdminSession: CanActivateFn = () => {
  const adminSessionStore = inject(AdminSessionStore);
  const router = inject(Router);

  return adminSessionStore.isSignedIn() || router.createUrlTree(['/admin']);
};
