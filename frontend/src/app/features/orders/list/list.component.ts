import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { components } from '../../../core/api/api-types';

// Tipo derivado del contrato (Principio VII): openapi-typescript expone los schemas
// bajo `components['schemas']`, no como exports nombrados.
type WorkOrder = components['schemas']['WorkOrder'];

// Listado de órdenes propias (US4, FR-010). Tailwind con tokens centralizados (Principio VIII).
@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="rounded-control bg-white p-6 shadow">
      <h2 class="mb-4 text-xl font-semibold">Mis órdenes</h2>
      @if (orders().length === 0) {
        <p class="text-sm text-slate-500">No tienes órdenes asignadas.</p>
      } @else {
        <ul class="flex flex-col gap-2">
          @for (o of orders(); track o.id) {
            <li class="flex items-center justify-between rounded-control border border-slate-200 px-4 py-field">
              <span>{{ o.service }} — {{ o.customer }} <span class="text-xs text-slate-500">({{ o.state }})</span></span>
              <a [routerLink]="['/orders', o.id, 'execution']" class="text-sm font-medium text-brand hover:underline">Abrir</a>
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class OrdersListComponent {
  private readonly http = inject(HttpClient);
  readonly orders = signal<WorkOrder[]>([]);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.orders.set(await firstValueFrom(this.http.get<WorkOrder[]>('/api/v1/orders')));
  }
}
