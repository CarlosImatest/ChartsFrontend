import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../shared/models/user.model';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  authService = inject(AuthService);
  themeService = inject(ThemeService);
  UserRole = UserRole;
}