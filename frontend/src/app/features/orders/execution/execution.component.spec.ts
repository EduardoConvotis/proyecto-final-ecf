import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ExecutionComponent } from './execution.component';

// Test (Principio IV) — FR-003/014/015: el formulario valida evidencia y campos obligatorios
// en cliente (defensa en profundidad) antes de enviar.
describe('ExecutionComponent', () => {
  let post: jasmine.Spy;

  function create(): ExecutionComponent {
    post = jasmine.createSpy('post').and.returnValue(of({}));
    TestBed.configureTestingModule({
      imports: [ExecutionComponent],
      providers: [
        { provide: HttpClient, useValue: { post } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'o1' } } } },
      ],
    });
    return TestBed.createComponent(ExecutionComponent).componentInstance;
  }

  it('bloquea el envío sin fotos y no llama al backend (FR-003)', async () => {
    const c = create();
    c.location = 'Calle 1';
    c.signature = 'firma';
    c.durationMinutes = 30;
    c.photos = [];
    await c.submit();
    expect(c.error()).toContain('foto');
    expect(post).not.toHaveBeenCalled();
  });

  it('bloquea fotos no JPEG (FR-014)', async () => {
    const c = create();
    c.location = 'Calle 1';
    c.signature = 'firma';
    c.durationMinutes = 30;
    c.photos = [new File([new Uint8Array([1])], 'a.png', { type: 'image/png' })];
    await c.submit();
    expect(c.error()).toContain('JPEG');
    expect(post).not.toHaveBeenCalled();
  });

  it('bloquea el envío sin ubicación o firma (FR-015)', async () => {
    const c = create();
    c.location = '';
    c.signature = 'firma';
    c.durationMinutes = 30;
    c.photos = [new File([new Uint8Array([1])], 'a.jpg', { type: 'image/jpeg' })];
    await c.submit();
    expect(c.error()).toContain('ubicación');
    expect(post).not.toHaveBeenCalled();
  });
});
