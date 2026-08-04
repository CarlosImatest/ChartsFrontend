import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
})
export class Signup implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  inviteToken: string | null = null;
  firstName = '';
  lastName = '';
  password = '';

  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    // The invite token travels entirely in the URL query string —
    // e.g. /signup?invite=abc123 — set by the link the admin generated
    // and emailed. We never ask the user to type it in manually.
    this.inviteToken = this.route.snapshot.queryParamMap.get('invite');

    if (!this.inviteToken) {
      this.errorMessage.set('This link is missing an invite token. Please use the link from your invite email.');
    }
  }

  onSubmit(): void {
    if (!this.inviteToken) return;

    this.errorMessage.set(null);

    this.authService.registerWithInvite({
      invite_token: this.inviteToken,
      first_name: this.firstName,
      last_name: this.lastName,
      password: this.password
    }).subscribe({
      next: (response) => {
        this.authService.handleAuthSuccess(response);
        // Always PENDING_VERIFICATION at this point — straight to waiting.
        this.router.navigate(['/waiting']);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.detail ?? 'Failed to create account. The invite link may be invalid or expired.');
      }
    });
  }
}