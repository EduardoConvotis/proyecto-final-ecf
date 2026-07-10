import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

interface KeyPoint { text: string; sourceNoteFragment: string }
interface IncidentSummary {
  status: 'ok' | 'insufficient_evidence' | 'provider_failed';
  keyPoints: KeyPoint[];
}
interface ReviewView {
  order: { id: string; service: string; customer: string; state: string };
  technicianNotes?: string;
  incidentSummary: IncidentSummary;
}

// Revisión del supervisor con resumen de incidencia (US2 + US5, FR-007/008/009/017/023/025).
@Component({
  selector: 'app-review',
  standalone: true,
  template: `
    <section class="rounded-control bg-white p-6 shadow">
      <h2 class="mb-4 text-xl font-semibold">Revisión de ejecución</h2>
      @if (view(); as v) {
        <p class="mb-2 text-sm text-slate-500">{{ v.order.service }} — {{ v.order.customer }} ({{ v.order.state }})</p>

        <h3 class="mt-4 font-medium">Resumen de incidencia</h3>
        @switch (v.incidentSummary.status) {
          @case ('ok') {
            <ul class="list-disc pl-5 text-sm">
              @for (k of v.incidentSummary.keyPoints; track k.sourceNoteFragment) {
                <li>{{ k.text }} <span class="text-xs text-slate-400">(“{{ k.sourceNoteFragment }}”)</span></li>
              }
            </ul>
          }
          @case ('insufficient_evidence') {
            <p class="text-sm text-slate-500">Evidencia insuficiente para resumir. Notas del técnico:</p>
            <p class="text-sm">{{ v.technicianNotes || '—' }}</p>
          }
          @default {
            <p class="text-sm text-danger">Resumen no disponible. Notas del técnico:</p>
            <p class="text-sm">{{ v.technicianNotes || '—' }}</p>
          }
        }

        <div class="mt-6 flex gap-field">
          <button type="button" (click)="decide('approve')" [disabled]="busy()"
            class="rounded-control bg-brand px-4 py-2 font-medium text-brand-fg hover:opacity-90 disabled:opacity-50">Aprobar</button>
          <button type="button" (click)="decide('reject')" [disabled]="busy()"
            class="rounded-control border border-danger px-4 py-2 font-medium text-danger hover:bg-red-50 disabled:opacity-50">Rechazar</button>
        </div>
        @if (message()) { <p role="status" class="mt-3 text-sm text-slate-600">{{ message() }}</p> }
      }
    </section>
  `,
})
export class ReviewComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly orderId = this.route.snapshot.paramMap.get('orderId');
  readonly view = signal<ReviewView | null>(null);
  readonly busy = signal(false);
  readonly message = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.view.set(await firstValueFrom(this.http.get<ReviewView>(`/api/v1/orders/${this.orderId}/review`)));
  }

  async decide(outcome: 'approve' | 'reject'): Promise<void> {
    this.busy.set(true);
    try {
      await firstValueFrom(this.http.post(`/api/v1/orders/${this.orderId}/review`, { outcome }));
      this.message.set(outcome === 'approve' ? 'Ejecución aprobada' : 'Ejecución rechazada');
      await this.load();
    } finally {
      this.busy.set(false);
    }
  }
}
