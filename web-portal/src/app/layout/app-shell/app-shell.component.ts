import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map, shareReplay } from 'rxjs/operators';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    BottomNavComponent
  ],
  template: `
    <div class="public-site-layout">
      <!-- Public Header Navigation -->
      <header class="main-header" [class.sticky]="true">
        <div class="header-container">
          <div class="brand" routerLink="/home">
            <mat-icon class="logo-icon">eco</mat-icon>
            <span class="logo-text">Punjab<span>CleanAir</span></span>
          </div>

          <!-- Desktop Nav -->
          @if (isDesktop$ | async) {
            <nav class="desktop-nav">
              <a routerLink="/home" routerLinkActive="active">Home</a>
              <a routerLink="/search" routerLinkActive="active">Rent Machinery</a>
              <a routerLink="/firms" routerLinkActive="active">Firms</a>
              <a routerLink="/news" routerLinkActive="active">Agri-News</a>
              <a routerLink="/imei-verification" routerLinkActive="active">Verify IMEI</a>
            </nav>
            <div class="auth-actions">
              <button mat-button class="login-btn" routerLink="/login">Log In</button>
              <button mat-flat-button color="primary" class="signup-btn" routerLink="/login">Get Started</button>
            </div>
          } @else {
            <!-- Mobile Menu -->
            <button mat-icon-button [matMenuTriggerFor]="mobileMenu">
              <mat-icon>menu</mat-icon>
            </button>
            <mat-menu #mobileMenu="matMenu">
              <button mat-menu-item routerLink="/home">Home</button>
              <button mat-menu-item routerLink="/search">Rent Machinery</button>
              <button mat-menu-item routerLink="/firms">Firms</button>
              <button mat-menu-item routerLink="/news">Agri-News</button>
              <button mat-menu-item routerLink="/imei-verification">Verify IMEI</button>
            </mat-menu>
          }
        </div>
      </header>

      <!-- Main Content Area -->
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>

      <!-- Public Footer -->
      <footer class="main-footer">
        <div class="footer-container">
          <div class="footer-brand">
            <div class="brand">
              <mat-icon class="logo-icon">eco</mat-icon>
              <span class="logo-text">Punjab<span>CleanAir</span></span>
            </div>
            <p>Advancing environmental sustainability and air quality across Punjab. Monitoring emissions and driving ecological innovation for a healthier future.</p>
          </div>
          
          <div class="footer-links">
            <div class="link-group">
              <h4>Quick Links</h4>
              <a routerLink="/home">Home</a>
              <a routerLink="/search">Marketplace</a>
              <a routerLink="/firms">Firms Registry</a>
              <a routerLink="/imei-verification">IMEI Verification</a>
            </div>
            <div class="link-group">
              <h4>Support</h4>
              <a href="#">Help Center</a>
              <a href="#">Contact Us</a>
              <a href="#">Privacy Policy</a>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; 2026 Punjab Clean Air Program. All rights reserved. Government of Punjab.</p>
        </div>
      </footer>

      <!-- Mobile Bottom Nav (Sync with Mobile Layout) -->
      @if (!(isDesktop$ | async)) {
        <app-bottom-nav></app-bottom-nav>
      }
    </div>
  `,
  styles: [`
    .public-site-layout {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: #ffffff;
    }

    .main-header {
      height: 80px;
      display: flex;
      align-items: center;
      background: white;
      border-bottom: 1px solid #f0f0f0;
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
    }

    .header-container {
      max-width: 1280px;
      margin: 0 auto;
      width: 100%;
      padding: 0 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      .logo-icon { color: #4CAF50; font-size: 32px; width: 32px; height: 32px; }
      .logo-text { 
        font-size: 24px; 
        font-weight: 800; 
        color: #2D3748; 
        letter-spacing: -1px;
        span { color: #4CAF50; }
      }
    }

    .desktop-nav {
      display: flex;
      gap: 32px;
      a {
        text-decoration: none;
        color: #4A5568;
        font-weight: 500;
        font-size: 16px;
        transition: color 0.2s;
        &:hover, &.active { color: #4CAF50; }
      }
    }

    .auth-actions {
      display: flex;
      gap: 12px;
    }

    .login-btn { color: #4A5568; font-weight: 600; }
    .signup-btn {
      border-radius: 12px;
      padding: 0 24px;
      font-weight: 600;
      background-color: #4CAF50 !important;
    }

    .main-content {
      flex: 1;
    }

    /* Footer Styles */
    .main-footer {
      background: #1A202C;
      color: #E2E8F0;
      padding: 80px 24px 40px;
      margin-top: 0;
      border-top: 1px solid #f0f0f0;
    }

    .footer-container {
      max-width: 1280px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 48px;
    }

    .footer-brand {
      max-width: 400px;
      .logo-text { color: white; }
      p { margin-top: 20px; color: #A0AEC0; font-size: 15px; line-height: 1.6; }
    }

    .footer-links {
      display: flex;
      gap: 64px;
    }

    .link-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
      h4 { color: white; margin-bottom: 12px; font-weight: 700; }
      a { color: #A0AEC0; text-decoration: none; font-size: 15px; &:hover { color: #4CAF50; } }
    }

    .footer-bottom {
      max-width: 1280px;
      margin: 48px auto 0;
      padding-top: 24px;
      border-top: 1px solid #2D3748;
      text-align: center;
      color: #718096;
      font-size: 14px;
    }

    @media (max-width: 959px) {
      .main-header { height: 64px; }
      .brand .logo-text { font-size: 20px; }
      .footer-container { flex-direction: column; gap: 32px; }
      .main-content { padding-bottom: 72px; } /* Space for mobile nav */
    }
  `]
})
export class AppShellComponent {
  private breakpointObserver = inject(BreakpointObserver);

  isDesktop$ = this.breakpointObserver.observe([Breakpoints.Medium, Breakpoints.Large, Breakpoints.XLarge])
    .pipe(
      map(result => result.matches),
      shareReplay()
    );
}
