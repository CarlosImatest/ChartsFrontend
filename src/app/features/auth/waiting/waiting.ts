import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-waiting',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './waiting.html',
  styleUrl: './waiting.scss',
})
export class Waiting {
  private authService = inject(AuthService);
  private router = inject(Router);

  code = '';
  errorMessage = signal<string | null>(null);
  resendMessage = signal<string | null>(null);

  get userEmail(): string {
    return this.authService.currentUser()?.email ?? '';
  }

  onVerify(): void {
    this.errorMessage.set(null);

    this.authService.verifyEmail({ code: this.code }).subscribe({
      next: (updatedUser) => {
        // The response is the fresh UserResponse with status now ACTIVE.
        // Update the signal directly rather than re-fetching — we
        // already have everything we need from this response.
        this.authService.currentUser.set(updatedUser);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.detail ?? 'Verification failed.');
      }
    });
  }

  onResend(): void {
    this.errorMessage.set(null);
    this.resendMessage.set(null);

    this.authService.resendCode().subscribe({
      next: () => {
        this.resendMessage.set('A new code has been sent to your email.');
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.detail ?? 'Failed to resend code.');
      }
    });
  }
}