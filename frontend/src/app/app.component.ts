import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <header class="flex items-center justify-between bg-brand px-6 py-field text-brand-fg">
      <h1 class="text-lg font-semibold">FieldOps</h1>
      @if (auth.isAuthenticated()) {
        <button
          type="button"
          class="rounded-control bg-brand-muted px-4 py-2 text-sm font-medium text-brand hover:opacity-90"
          (click)="logout()"
        >
          Cerrar sesión
        </button>
      }
    </header>
    <main class="mx-auto max-w-3xl p-6">
      <router-outlet />
    </main>
  `,
})
export class AppComponent {
  readonly auth = inject(AuthService);
  logout(): void {
    void this.auth.logout();
  }
}
