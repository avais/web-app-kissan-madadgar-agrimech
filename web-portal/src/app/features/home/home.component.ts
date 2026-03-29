import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MachineryService } from '../../core/services/machinery.service';
import { MachineryCardComponent } from '../../shared/components/machinery-card/machinery-card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatCardModule, MachineryCardComponent],
  template: `
    <div class="landing-page">
      <!-- Hero Section -->
      <section class="hero">
        <div class="container">
          <div class="hero-content">
            <h1 class="animate-up">Punjab's Leading Air <br><span>Quality Initiative</span></h1>
            <p class="animate-up delay-1">Driving a cleaner, greener future for Punjab through advanced air monitoring and emission control. Join us in making the air breathable again.</p>
            <div class="hero-btns animate-up delay-2">
              <button mat-flat-button color="primary" class="btn-lg" routerLink="/search">Start Renting Now</button>
              <button mat-stroked-button class="btn-lg secondary">List Your Machinery</button>
            </div>
          </div>
          <div class="hero-visual animate-up delay-1">
             <div class="hero-tractor-card">
                <mat-icon class="icon">eco</mat-icon>
                <div class="label">Eco Verified</div>
             </div>
             <div class="stats-badge">
                <span class="val">100%</span>
                <span class="txt">Air Quality Focus</span>
             </div>
          </div>
        </div>
      </section>

      <!-- Trusted By Section -->
      <section class="social-proof">
        <div class="container">
          <p>Trusted by 10,000+ Farmers in Punjab</p>
          <div class="logos">
            <div class="logo">AgriCorp</div>
            <div class="logo">PunjabGrameen</div>
            <div class="logo">FaisalabadHub</div>
            <div class="logo">IndusAgri</div>
          </div>
        </div>
      </section>

      <!-- Why Choose Us -->
      <section class="features">
        <div class="container">
          <div class="section-title">
            <h2>Why Punjab Clean Air Program?</h2>
            <p>We're dedicated to implementing sustainable environmental solutions for a cleaner Punjab.</p>
          </div>
          <div class="features-grid">
            <div class="feature-card">
              <mat-icon>verified_user</mat-icon>
              <h3>Verified Owners</h3>
              <p>Every firm and machine is hand-verified for quality and reliability.</p>
            </div>
            <div class="feature-card">
              <mat-icon>payments</mat-icon>
              <h3>Transparent Pricing</h3>
              <p>No hidden fees. Pay for the hours you use with real-time tracking.</p>
            </div>
            <div class="feature-card">
              <mat-icon>support_agent</mat-icon>
              <h3>24/7 Support</h3>
              <p>Our call center is always ready to help you coordinate with operators.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Latest in Punjab -->
      <section class="featured-machinery">
        <div class="container">
          <div class="section-title">
            <div class="title-with-btn">
               <h2>Marketplace Highlights</h2>
               <button mat-button color="primary" routerLink="/search">Explore Full Catalog <mat-icon>east</mat-icon></button>
            </div>
          </div>
          <div class="grid">
            @for (machine of featuredMachines(); track machine.id) {
              <app-machinery-card [machine]="machine"></app-machinery-card>
            }
          </div>
        </div>
      </section>

      <!-- Call to Action -->
      <section class="cta-banner">
        <div class="container">
          <div class="cta-card">
            <h2>Ready to clear the air?</h2>
            <p>Join the initiative for a sustainable and pollution-free Punjab.</p>
            <button mat-flat-button class="white-btn btn-lg" routerLink="/search">Explore Marketplace</button>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 24px;
    }

    /* Hero Styles */
    .hero {
      padding: 100px 0 140px;
      background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
      overflow: hidden;
      .container { display: flex; align-items: center; gap: 40px; }
    }
    .hero-content {
      flex: 1;
      h1 { font-size: 56px; font-weight: 800; color: #1A202C; line-height: 1.1; margin-bottom: 24px; 
           span { color: #4CAF50; }
      }
      p { font-size: 20px; color: #4A5568; line-height: 1.6; margin-bottom: 40px; max-width: 540px; }
    }
    .hero-btns { display: flex; gap: 20px; }
    .btn-lg { height: 60px; padding: 0 36px; border-radius: 14px; font-size: 17px; font-weight: 700; }
    .secondary { background: white !important; border-color: #E2E8F0 !important; color: #1A202C !important; }

    .hero-visual {
      flex: 1;
      position: relative;
      background: #E8F5E9;
      height: 480px;
      border-radius: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .hero-tractor-card {
      background: white;
      padding: 40px;
      border-radius: 24px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      transform: rotate(-5deg);
      .icon { font-size: 80px; width: 80px; height: 80px; color: #4CAF50; }
      .label { font-weight: 700; font-size: 18px; color: #2D3748; }
    }
    .stats-badge {
      position: absolute;
      bottom: 40px;
      right: -20px;
      background: #1B5E20;
      color: white;
      padding: 24px 32px;
      border-radius: 20px;
      display: flex;
      flex-direction: column;
      .val { font-size: 28px; font-weight: 800; }
      .txt { font-size: 14px; opacity: 0.8; }
    }

    /* Social Proof */
    .social-proof {
      padding: 60px 0;
      border-top: 1px solid #f0f0f0;
      border-bottom: 1px solid #f0f0f0;
      text-align: center;
      p { color: #718096; text-transform: uppercase; font-size: 12px; letter-spacing: 2px; font-weight: 700; margin-bottom: 32px; }
      .logos { display: flex; justify-content: space-around; flex-wrap: wrap; gap: 40px; filter: grayscale(1); opacity: 0.6; }
      .logo { font-size: 20px; font-weight: 800; color: #2D3748; }
    }

    /* Features */
    .features {
      padding: 120px 0;
      background: white;
    }
    .section-title {
      text-align: center;
      margin-bottom: 64px;
      h2 { font-size: 36px; font-weight: 800; color: #1A202C; }
      p { font-size: 18px; color: #718096; margin-top: 12px; }
      .title-with-btn {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        text-align: left;
        h2 { margin: 0; }
      }
    }
    .features-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
    }
    .feature-card {
      padding: 40px;
      border-radius: 24px;
      background: #F7FAFC;
      transition: all 0.3s;
      mat-icon { font-size: 40px; width: 40px; height: 40px; color: #4CAF50; margin-bottom: 24px; }
      h3 { font-size: 22px; font-weight: 700; margin-bottom: 16px; }
      p { color: #4A5568; line-height: 1.6; }
      &:hover { background: #E8F5E9; transform: translateY(-10px); }
    }

    /* Featured Section */
    .featured-machinery { padding-bottom: 120px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
      gap: 32px;
    }

    /* CTA Banner */
    .cta-banner { padding-bottom: 120px; }
    .cta-card {
      background: #1B5E20;
      padding: 80px;
      border-radius: 32px;
      text-align: center;
      color: white;
      h2 { font-size: 40px; font-weight: 800; margin-bottom: 16px; }
      p { font-size: 20px; opacity: 0.8; margin-bottom: 40px; max-width: 600px; margin-inline: auto; }
      .white-btn { background: white !important; color: #1B5E20 !important; }
    }

    /* Animations */
    .animate-up { opacity: 0; transform: translateY(20px); animation: fadeInUp 0.6s forwards; }
    .delay-1 { animation-delay: 0.2s; }
    .delay-2 { animation-delay: 0.4s; }
    @keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }

    @media (max-width: 959px) {
      .hero { padding: 60px 0; .container { flex-direction: column; text-align: center; } }
      .hero-content h1 { font-size: 36px; }
      .hero-visual { height: 320px; width: 100%; margin-top: 40px; }
      .hero-tractor-card { padding: 20px; .icon { font-size: 48px; width: 48px; height: 48px; } }
      .stats-badge { padding: 16px; bottom: 20px; right: 0; }
      .features-grid { grid-template-columns: 1fr; }
      .grid { grid-template-columns: 1fr; }
      .title-with-btn { flex-direction: column; align-items: center; gap: 16px; text-align: center; }
      .cta-card { padding: 40px 24px; h2 { font-size: 28px; } }
    }
  `]
})
export class HomeComponent {
  private machineryService = inject(MachineryService);
  featuredMachines = signal(this.machineryService.machines().slice(0, 3));
}
