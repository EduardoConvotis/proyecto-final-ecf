import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

const MAX_PHOTOS = 15;
const MAX_BYTES = 10 * 1024 * 1024;

// Pantalla de registro de ejecución (US1). Valida en cliente (defensa en profundidad);
// la autoridad es el backend. Tailwind con tokens centralizados (Principio VIII).
@Component({
  selector: 'app-execution',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="rounded-control bg-white p-6 shadow">
      <h2 class="mb-4 text-xl font-semibold">Registrar ejecución</h2>
      <form (ngSubmit)="submit()" class="flex flex-col gap-field">
        <label class="flex flex-col gap-1 text-sm">
          <span>Notas del técnico</span>
          <textarea name="notes" [(ngModel)]="notes" rows="3"
            class="rounded-control border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"></textarea>
        </label>
        <label class="flex flex-col gap-1 text-sm">
          <span>Ubicación *</span>
          <input name="location" [(ngModel)]="location" required
            class="rounded-control border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand" />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          <span>Firma *</span>
          <input name="signature" [(ngModel)]="signature" required
            class="rounded-control border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand" />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          <span>Duración (minutos) *</span>
          <input name="duration" type="number" min="0" [(ngModel)]="durationMinutes" required
            class="rounded-control border border-slate-300 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand" />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          <span>Fotos JPEG (1–15, ≤10 MB) *</span>
          <input name="photos" type="file" accept="image/jpeg" multiple (change)="onFiles($event)"
            class="text-sm" />
        </label>
        @if (error()) {
          <p role="alert" class="text-sm text-danger">{{ error() }}</p>
        }
        <button type="submit" [disabled]="loading()"
          class="rounded-control bg-brand px-4 py-2 font-medium text-brand-fg hover:opacity-90 disabled:opacity-50">
          {{ loading() ? 'Enviando…' : 'Enviar ejecución' }}
        </button>
      </form>
    </section>
  `,
})
export class ExecutionComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  notes = '';
  location = '';
  signature = '';
  durationMinutes: number | null = null;
  photos: File[] = [];
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  onFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.photos = Array.from(input.files ?? []);
  }

  private validate(): string | null {
    if (this.photos.length < 1) return 'Se requiere al menos una foto de evidencia';
    if (this.photos.length > MAX_PHOTOS) return `Máximo ${MAX_PHOTOS} fotos`;
    for (const p of this.photos) {
      if (p.type !== 'image/jpeg') return 'Solo se aceptan fotos JPEG';
      if (p.size > MAX_BYTES) return 'Cada foto debe pesar ≤10 MB';
    }
    if (!this.location.trim()) return 'La ubicación es obligatoria';
    if (!this.signature.trim()) return 'La firma es obligatoria';
    if (this.durationMinutes === null || this.durationMinutes < 0) return 'La duración es obligatoria';
    return null;
  }

  async submit(): Promise<void> {
    this.error.set(null);
    const problem = this.validate();
    if (problem) {
      this.error.set(problem);
      return;
    }
    const orderId = this.route.snapshot.paramMap.get('orderId');
    const form = new FormData();
    form.set('technicianNotes', this.notes);
    form.set('location', this.location);
    form.set('signature', this.signature);
    form.set('workDurationMinutes', String(this.durationMinutes));
    this.photos.forEach((p) => form.append('photos', p));

    this.loading.set(true);
    try {
      await firstValueFrom(this.http.post(`/api/v1/orders/${orderId}/execution`, form));
    } catch {
      this.error.set('No se pudo enviar la ejecución');
    } finally {
      this.loading.set(false);
    }
  }
}
