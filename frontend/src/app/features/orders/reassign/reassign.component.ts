import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

// Reasignación por el dispatcher (US3, FR-005/006). Tailwind (Principio VIII).
@Component({
  selector: 'app-reassign',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="rounded-control bg-white p-6 shadow">
      <h2 class="mb-4 text-xl font-semibold">Reasignar orden</h2>
      <form (ngSubmit)="submit()" class="flex flex-col gap-field">
        <label class="flex flex-col gap-1 text-sm">
          <span>Nuevo técnico (ID)</span>
          <input name="to" [(ngModel)]="toTechnicianId" required
            class="rounded-control border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand" />
        </label>
        @if (message()) { <p role="status" class="text-sm text-slate-600">{{ message() }}</p> }
        <button type="submit" [disabled]="loading()"
          class="rounded-control bg-brand px-4 py-2 font-medium text-brand-fg hover:opacity-90 disabled:opacity-50">
          {{ loading() ? 'Reasignando…' : 'Reasignar' }}
        </button>
      </form>
    </section>
  `,
})
export class ReassignComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  toTechnicianId = '';
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);

  async submit(): Promise<void> {
    const orderId = this.route.snapshot.paramMap.get('orderId');
    this.loading.set(true);
    this.message.set(null);
    try {
      await firstValueFrom(this.http.post(`/api/v1/orders/${orderId}/reassignment`, { toTechnicianId: this.toTechnicianId }));
      this.message.set('Orden reasignada');
    } catch {
      this.message.set('No se pudo reasignar (¿orden aprobada o sin permiso?)');
    } finally {
      this.loading.set(false);
    }
  }
}
