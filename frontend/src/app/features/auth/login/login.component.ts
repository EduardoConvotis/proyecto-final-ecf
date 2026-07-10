import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

// Pantalla de inicio de sesión (US6, FR-026/027). Estilos con tokens Tailwind (Principio VIII).
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="mx-auto max-w-sm rounded-control bg-white p-6 shadow">
      <h2 class="mb-4 text-xl font-semibold">Iniciar sesión</h2>
      <form (ngSubmit)="submit()" class="flex flex-col gap-field">
        <label class="flex flex-col gap-1 text-sm">
          <span>Usuario</span>
          <input
            name="username"
            [(ngModel)]="username"
            required
            autocomplete="username"
            class="rounded-control border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          <span>Contraseña</span>
          <input
            name="password"
            type="password"
            [(ngModel)]="password"
            required
            autocomplete="current-password"
            class="rounded-control border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </label>
        @if (error()) {
          <p role="alert" class="text-sm text-danger">{{ error() }}</p>
        }
        <button
          type="submit"
          [disabled]="loading()"
          class="rounded-control bg-brand px-4 py-2 font-medium text-brand-fg hover:opacity-90 disabled:opacity-50"
        >
          {{ loading() ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>
    </section>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  username = '';
  password = '';
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async submit(): Promise<void> {
    this.error.set(null);
    this.loading.set(true);
    try {
      await this.auth.login(this.username, this.password);
      await this.router.navigate(['/']);
    } catch {
      // FR-027: mensaje genérico, no distingue usuario de contraseña.
      this.error.set('Usuario o contraseña incorrectos');
    } finally {
      this.loading.set(false);
    }
  }
}
