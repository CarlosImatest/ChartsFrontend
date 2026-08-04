import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { InviteService } from '../../../core/services/invite.service';
import { UserRole } from '../../../shared/models/user.model';
import { InviteResponse } from '../../../shared/models/invite.model';

@Component({
  selector: 'app-invite',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  templateUrl: './invite.html',
  styleUrl: './invite.scss',
})
export class Invite {
  private inviteService = inject(InviteService);

  roles = Object.values(UserRole);

  email = '';
  role: UserRole = UserRole.VIEWER;

  result = signal<InviteResponse | null>(null);
  errorMessage = signal<string | null>(null);

  onSubmit(): void {
    this.result.set(null);
    this.errorMessage.set(null);

    this.inviteService.createInvite({ email: this.email, role: this.role }).subscribe({
      next: (response) => {
        this.result.set(response);
        this.email = '';
        this.role = UserRole.VIEWER;
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.detail ?? 'Failed to create invite.');
      }
    });
  }

  copyLink(): void {
    const url = this.result()?.invite_url;
    if (url) {
      navigator.clipboard.writeText(url);
    }
  }
}