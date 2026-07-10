import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type Role = 'tecnico' | 'dispatcher' | 'supervisor';
interface AuthToken {
  token: string;
  role: Role;
}

const STORAGE_KEY = 'fieldops.session';

// Servicio de autenticación del frontend (US6). Defensa en profundidad: la autoridad
// real es el backend (ADR-0001); aquí solo guardamos la sesión y el rol.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly session = signal<AuthToken | null>(this.load());
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly role = computed(() => this.session()?.role ?? null);

  constructor(private readonly http: HttpClient) {}

  get token(): string | null {
    return this.session()?.token ?? null;
  }

  async login(username: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<AuthToken>('/api/v1/auth/login', { username, password }),
    );
    this.session.set(res);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(res));
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/api/v1/auth/logout', {}));
    } finally {
      this.clear();
    }
  }

  clear(): void {
    this.session.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  private load(): AuthToken | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthToken) : null;
  }
}
