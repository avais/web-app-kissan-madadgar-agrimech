import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    RouterModule
  ],
  template: `
    <div class="login-container">
      <!-- Loading Overlay -->
      <div class="loading-overlay" *ngIf="isLoading()">
        <div class="loader-content">
          <mat-spinner diameter="60" strokeWidth="6"></mat-spinner>
          <div class="loader-text">
            <h3>Authenticating</h3>
            <p>Accessing the Punjab Clean Air dashboard...</p>
          </div>
        </div>
      </div>

      <div class="login-left">
        <div class="overlay"></div>
        <div class="content">
          <div class="brand">
            <mat-icon class="logo-icon">eco</mat-icon>
            <h1>Punjab<span>CleanAir</span></h1>
          </div>
          <p class="subtitle">Ensuring a Greener and Healthier Punjab for All</p>
          <div class="features-list">
            <div class="feature-item">
              <mat-icon>check_circle</mat-icon>
              <span>Real-time air quality monitoring</span>
            </div>
            <div class="feature-item">
              <mat-icon>check_circle</mat-icon>
              <span>Emission compliance tracking</span>
            </div>
            <div class="feature-item">
              <mat-icon>check_circle</mat-icon>
              <span>Eco-innovation project support</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="login-right">
        <div class="login-card">
          <div class="mobile-brand">
             <mat-icon class="logo-icon">eco</mat-icon>
             <h2>Punjab<span>CleanAir</span></h2>
          </div>
          
          <div class="login-header">
            <h2>Welcome Back</h2>
            <p>Please enter your credentials to access the portal</p>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email Address</mat-label>
              <input matInput formControlName="email" type="email" placeholder="name@example.com" (input)="errorMessage.set(null)">
              <mat-icon matPrefix>email</mat-icon>
              <mat-error *ngIf="loginForm.get('email')?.hasError('required')">Email is required</mat-error>
              <mat-error *ngIf="loginForm.get('email')?.hasError('email')">Invalid email address</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput [type]="hidePassword ? 'password' : 'text'" formControlName="password" (input)="errorMessage.set(null)">
              <mat-icon matPrefix>lock</mat-icon>
              <button mat-icon-button matSuffix (click)="hidePassword = !hidePassword" [attr.aria-label]="'Hide password'" type="button">
                <mat-icon>{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
              </button>
              <mat-error *ngIf="loginForm.get('password')?.hasError('required')">Password is required</mat-error>
            </mat-form-field>

            <div class="actions">
              <a href="#" class="forgot-link">Forgot Password?</a>
            </div>

            <div class="captcha-container" *ngIf="captchaImage()">
              <div class="captcha-img-box">
                <img [src]="'data:image/png;base64,' + captchaImage()" alt="CAPTCHA">
                <button mat-icon-button type="button" (click)="loadCaptcha()" title="Refresh CAPTCHA">
                  <mat-icon>refresh</mat-icon>
                </button>
              </div>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Enter Captcha</mat-label>
                <input matInput formControlName="captchaValue" placeholder="6-digit number" inputmode="numeric" pattern="[0-9]*" (input)="errorMessage.set(null)">
                <mat-error *ngIf="loginForm.get('captchaValue')?.hasError('required')">CAPTCHA is required</mat-error>
              </mat-form-field>
            </div>

            <div class="error-container" *ngIf="errorMessage()">
              <mat-icon>error_outline</mat-icon>
              <span>{{ errorMessage() }}</span>
            </div>

            <button mat-flat-button color="primary" class="login-btn" type="submit" [disabled]="loginForm.invalid || isLoading()">
              {{isLoading() ? 'Connecting...' : 'Sign In to Portal'}}
            </button>
            
            <div class="register-hint">
              <span>New here?</span>
              <a href="#">Register as a Partner</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      min-height: 100vh;
      background: #ffffff;
      font-family: 'Roboto', sans-serif;
      position: relative;
    }

    .loading-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease-out;

      .loader-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 24px;
        text-align: center;

        .loader-text {
          h3 { font-size: 24px; font-weight: 800; color: #1e293b; margin: 0; }
          p { color: #64748b; font-size: 16px; margin: 8px 0 0; }
        }
      }
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .login-left {
      flex: 1.2;
      background: linear-gradient(rgba(27, 94, 32, 0.8), rgba(76, 175, 80, 0.9)), 
                  url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=2000') no-repeat center center;
      background-size: cover;
      position: relative;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;

      @media (max-width: 991px) {
        display: none;
      }
    }

    .login-left .content {
      max-width: 500px;
      z-index: 10;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 20px;
      
      .logo-icon { 
        font-size: 48px; 
        width: 48px; 
        height: 48px; 
        color: #ffffff;
      }
      
      h1 { 
        font-size: 36px; 
        font-weight: 800; 
        margin: 0;
        span { opacity: 0.8; }
      }
    }

    .subtitle {
      font-size: 20px;
      opacity: 0.9;
      margin-bottom: 40px;
      line-height: 1.4;
    }

    .features-list {
      display: flex;
      flex-direction: column;
      gap: 20px;

      .feature-item {
        display: flex;
        align-items: center;
        gap: 15px;
        font-size: 18px;
        font-weight: 500;
        
        mat-icon {
          color: #ffffff;
        }
      }
    }

    .login-right {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      background: #f8fafc;
    }

    .login-card {
      width: 100%;
      max-width: 450px;
      padding: 40px;
      background: white;
      border-radius: 24px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.05);

      @media (max-width: 576px) {
        padding: 24px;
      }
    }

    .mobile-brand {
      display: none;
      align-items: center;
      gap: 10px;
      margin-bottom: 30px;
      justify-content: center;
      
      @media (max-width: 991px) {
        display: flex;
      }
      
      .logo-icon { color: #4CAF50; }
      h2 { color: #1B5E20; margin: 0; font-weight: 800; span { color: #4CAF50; } }
    }

    .login-header {
      margin-bottom: 32px;
      h2 { font-size: 28px; font-weight: 800; color: #1e293b; margin-bottom: 8px; }
      p { color: #64748b; font-size: 16px; }
    }

    .full-width {
      width: 100%;
      margin-bottom: 8px;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 24px;
      
      .forgot-link {
        color: #4CAF50;
        text-decoration: none;
        font-size: 14px;
        font-weight: 600;
        &:hover { text-decoration: underline; }
      }
    }

    .login-btn {
      width: 100%;
      height: 56px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 700;
      background-color: #1B5E20 !important;
      margin-bottom: 24px;
    }

    .captcha-container {
      margin-bottom: 16px;
      
      .captcha-img-box {
        display: flex;
        align-items: center;
        gap: 12px;
        background: #f1f5f9;
        padding: 8px;
        border-radius: 8px;
        margin-bottom: 12px;
        justify-content: center;
        border: 1px solid #e2e8f0;

        img {
          height: 40px;
          border-radius: 4px;
        }

        button {
          color: #1B5E20;
        }
      }
    }

    .error-container {
      background: #fef2f2;
      border: 1px solid #fee2e2;
      color: #dc2626;
      padding: 12px;
      border-radius: 12px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      font-weight: 500;
      animation: slideIn 0.3s ease-out;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .register-hint {
      text-align: center;
      font-size: 14px;
      color: #64748b;
      
      a {
        color: #4CAF50;
        text-decoration: none;
        font-weight: 700;
        margin-left: 5px;
        &:hover { text-decoration: underline; }
      }
    }

    :host ::ng-deep {
      .mat-mdc-progress-spinner circle { stroke: #1B5E20 !important; }
      .mat-mdc-form-field-focus-overlay { background: transparent; }
    }
  `]
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  hidePassword = true;
  isLoading = signal(false);
  captchaImage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    captchaValue: ['', [Validators.required]],
    captchaId: ['']
  });

  ngOnInit() {
    this.loadCaptcha();
  }

  loadCaptcha() {
    this.authService.getCaptcha().subscribe({
      next: (res) => {
        this.captchaImage.set(res.captchaImage);
        this.loginForm.patchValue({ captchaId: res.captchaId, captchaValue: '' });
      },
      error: (err) => {
        console.error('Failed to load captcha', err);
      }
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      const { email, password, captchaId, captchaValue } = this.loginForm.value;
      this.authService.login({
        email: email!,
        password: password!,
        captchaId: captchaId!,
        captchaValue: captchaValue!
      }).subscribe({
        next: () => this.isLoading.set(false),
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.message || 'Authentication failed. Please try again.');
          this.loadCaptcha(); // Reload captcha on failure
        }
      });
    }
  }
}
