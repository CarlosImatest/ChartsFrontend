import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../core/services/auth.service';
import { UserStatus } from '../../../shared/models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  errorMessage = signal<string | null>(null);

  onSubmit(): void {
    this.errorMessage.set(null);

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (response) => {
        this.authService.handleAuthSuccess(response);

        // A pending user logging back in (e.g. closed the tab mid-flow)
        // should land back on the waiting page, not the home page.
        if (response.user.status === UserStatus.PENDING_VERIFICATION) {
          this.router.navigate(['/waiting']);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: () => {
        this.errorMessage.set('Incorrect email or password.');
      }
    });
  }
}