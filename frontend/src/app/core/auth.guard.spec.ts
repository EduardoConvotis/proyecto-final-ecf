import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

// Test (Principio IV) — FR-028: ruta protegida sin sesión redirige a /login.
describe('authGuard', () => {
  function setup(isAuth: boolean) {
    const router = { parseUrl: (u: string) => u as unknown as UrlTree };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated: () => isAuth } },
        { provide: Router, useValue: router },
      ],
    });
  }

  it('permite el acceso si hay sesión', () => {
    setup(true);
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect(result).toBe(true);
  });

  it('redirige a /login si no hay sesión', () => {
    setup(false);
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect(result).toBe('/login');
  });
});
