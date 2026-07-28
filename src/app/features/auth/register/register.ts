import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { UserCreate, UserRole } from '../../../shared/models/user.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/auth`;

  roles = Object.values(UserRole);

  firstName = '';
  lastName = '';
  email = '';
  password = '';
  role: UserRole = UserRole.VIEWER;

  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  onSubmit(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);

    const payload: UserCreate = {
      first_name: this.firstName,
      last_name: this.lastName,
      email: this.email,
      password: this.password,
      role: this.role
    };

    this.http.post(`${this.baseUrl}/register`, payload).subscribe({
      next: () => {
        this.successMessage.set(`User ${this.firstName} ${this.lastName} created.`);
        this.firstName = '';
        this.lastName = '';
        this.email = '';
        this.password = '';
        this.role = UserRole.VIEWER;
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.detail ?? 'Failed to create user.');
      }
    });
  }
}