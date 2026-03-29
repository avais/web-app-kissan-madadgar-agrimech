import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FeatureService, Feature } from '../../../core/services/feature.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-manage-features',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatCardModule],
  template: `
    <div class="features-page">
      <!-- Background Decorative Elements -->
      <div class="bg-shape bg-shape-1"></div>
      <div class="bg-shape bg-shape-2"></div>

      <!-- Loading State -->
      <div class="loader-overlay glass-panel" *ngIf="isLoading()">
        <div class="loader-container animate-scale-in">
          <mat-spinner diameter="48" strokeWidth="4" class="custom-spinner"></mat-spinner>
          <div class="loader-text">
            <h3>Syncing System Modules</h3>
            <p>Retrieving capabilities...</p>
          </div>
        </div>
      </div>

      <div class="content-wrapper">
        <div class="header-section">
          <div class="title-section">
            <h1 class="gradient-text">System Modules & Capabilities</h1>
            <p class="subtitle">Overview of all active navigational hierarchies and core features.</p>
          </div>
          <div class="header-actions">
             <button class="btn-premium-secondary" (click)="loadFeatures()">
              <mat-icon>sync</mat-icon> <span>Refresh Configuration</span>
            </button>
          </div>
        </div>

        <div class="modules-container">
          <!-- Module Group Horizontal ROW -->
          <div class="module-row animate-fade-in" *ngFor="let module of featureModules(); let i = index" [style.animation-delay]="(i * 0.05) + 's'">
            <!-- Left: Module Header (Green Check) -->
            <div class="module-header">
              <div class="check-box-wrapper parent-check shadow-sm">
                <mat-icon>check</mat-icon>
              </div>
              <h3>{{module.name}}</h3>
            </div>

            <!-- Right: Horizontal Sub-features Grid -->
            <div class="capabilities-grid">
              <div class="capability-item" *ngFor="let cap of getFlattenedSubFeatures(module)">
                <div class="check-box-wrapper child-check">
                   <mat-icon>check</mat-icon>
                </div>
                <span class="cap-name">{{cap.name}}</span>
              </div>
              
              <div class="empty-caps" *ngIf="getFlattenedSubFeatures(module).length === 0">
                <mat-icon class="pulse-icon">info_outline</mat-icon>
                <span>No specific capabilities assigned</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state-premium glass-card animate-fade-in" *ngIf="featureModules().length === 0 && !isLoading()">
          <div class="empty-icon-wrap">
            <mat-icon>dashboard_customize</mat-icon>
          </div>
          <h2>Awaiting Configuration</h2>
          <p>The system modules have not been initialized yet. Connect to the database to sync.</p>
          <button class="btn-premium-primary mt-4" (click)="loadFeatures()">
            <mat-icon>bolt</mat-icon> Initialize Now
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      /* Refined Color Palette */
      --page-bg: #f4f7f9;
      --text-heading: #0f172a;
      --text-main: #334155;
      --text-muted: #64748b;
      --border-light: #f1f5f9;
      --border-subtle: rgba(226, 232, 240, 0.6);
      
      /* Premium Checkbox Colors - Exactly matching screenshot */
      --check-parent-bg: #10b981; /* Vibrant Emerald */
      --check-parent-icon: #ffffff;
      
      --check-child-bg: #fef08a; /* Soft Yellow/Gold */
      --check-child-icon: #a16207; /* Deep Yellow/Gold */

      --card-bg: rgba(255, 255, 255, 0.98);
      
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }

    .features-page {
      position: relative;
      padding: 40px 48px;
      min-height: calc(100vh - 70px);
      background-color: var(--page-bg);
      overflow: hidden;
      z-index: 1;
    }

    /* Ambient Background Shapes for a modern touch */
    .bg-shape {
      position: fixed;
      border-radius: 50%;
      filter: blur(100px);
      z-index: -1;
      opacity: 0.4;
      pointer-events: none;
    }
    .bg-shape-1 {
      width: 400px; height: 400px;
      background: #10b981;
      top: -100px; right: -50px;
      opacity: 0.08;
    }
    .bg-shape-2 {
      width: 500px; height: 500px;
      background: #3b82f6;
      bottom: -150px; left: -150px;
      opacity: 0.05;
    }
    
    .content-wrapper {
      max-width: 1440px;
      margin: 0 auto;
      position: relative;
      z-index: 2;
    }

    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border-subtle);

      .title-section h1 {
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.02em;
        margin: 0 0 8px 0;
        color: var(--text-heading);
      }
      
      .subtitle {
        margin: 0;
        color: var(--text-muted);
        font-size: 15px;
        font-weight: 400;
      }
    }

    /* Buttons */
    .btn-premium-secondary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 0 16px;
      height: 42px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      background: white;
      color: var(--text-heading);
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      
      &:hover { 
        background: #f8fafc; 
        border-color: #cbd5e1;
        transform: translateY(-1px);
        box-shadow: 0 4px 6px rgba(0,0,0,0.04);
      }
      &:active { transform: translateY(0); }
      mat-icon { font-size: 20px; width: 20px; height: 20px; color: #64748b; }
    }

    .btn-premium-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 0 24px;
      height: 44px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-size: 15px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
      transition: all 0.2s ease;

      &:hover { 
        box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
        transform: translateY(-2px);
      }
      &:active { transform: translateY(0); }
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
    }

    /* Modern List Layout */
    .modules-container {
      display: flex;
      flex-direction: column;
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 12px; /* Soft radius like a large card */
      border: 1px solid var(--border-light);
      box-shadow: 0 4px 20px -5px rgba(0,0,0,0.05); /* Soft, natural shadow */
    }

    /* Each Horizontal Row */
    .module-row {
      display: flex;
      flex-direction: column;
      padding: 28px 32px;
      border-bottom: 1px solid var(--border-light);
      transition: background-color 0.3s ease;
      
      &:last-child {
        border-bottom: none;
      }
      
      &:hover {
         background: #fafcfd;
      }
    }

    /* Parent Header Section */
    .module-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;

      h3 {
        font-size: 16px;
        font-weight: 700;
        color: var(--text-heading);
        margin: 0;
      }
    }

    /* Reusable Checkbox Wrapper styling */
    .check-box-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: transform 0.2s ease;
      
      mat-icon {
        font-weight: 900;
        line-height: 1;
      }

      &.parent-check {
        width: 18px;
        height: 18px;
        background: var(--check-parent-bg);
        color: var(--check-parent-icon);
        border-radius: 4px;
        
        mat-icon { font-size: 14px; width: 14px; height: 14px; }
      }

      &.child-check {
        width: 16px;
        height: 16px;
        background: var(--check-child-bg);
        color: var(--check-child-icon);
        border-radius: 3px;
        mat-icon { font-size: 12px; width: 12px; height: 12px; }
      }
    }
    
    .module-row:hover .parent-check {
      transform: scale(1.05);
    }

    /* Sub-features Grid */
    .capabilities-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr); /* Matching the screenshot's columns exactly */
      row-gap: 24px;
      column-gap: 24px;
      padding-left: 30px;
    }

    .capability-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      transition: all 0.2s ease;
      cursor: default;

      .check-box-wrapper {
        margin-top: 1px; /* perfect alignment with text baseline */
      }

      .cap-name {
        font-size: 13.5px;
        color: var(--text-main);
        font-weight: 500;
        line-height: 1.4;
      }

      &:hover {
        transform: translateX(2px);
        
        .child-check {
          transform: scale(1.1);
        }
        .cap-name {
          color: var(--text-heading);
        }
      }
    }

    .empty-caps {
      display: flex;
      align-items: center;
      gap: 8px;
      grid-column: 1 / -1;
      font-size: 14px;
      color: var(--text-muted);
      padding: 8px 0;
      
      .pulse-icon {
        font-size: 18px; width: 18px; height: 18px;
        opacity: 0.6;
      }
    }

    /* Loaders & Empty States */
    .glass-panel {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(10px);
    }

    .loader-overlay {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      z-index: 100; display: flex; align-items: center; justify-content: center;
      border-radius: 12px;
      
      .loader-container {
        display: flex; flex-direction: column; align-items: center; gap: 20px; 
        text-align: center;
        background: white;
        padding: 40px;
        border-radius: 20px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.08);
        border: 1px solid var(--border-light);

        ::ng-deep .mat-mdc-progress-spinner {
          --mdc-circular-progress-active-indicator-color: #10b981;
        }

        .loader-text h3 { font-size: 18px; font-weight: 700; color: var(--text-heading); margin: 0; }
        .loader-text p { color: var(--text-muted); font-size: 14px; margin: 6px 0 0; }
      }
    }

    .empty-state-premium {
      padding: 80px 40px;
      display: flex; flex-direction: column; align-items: center; text-align: center;
      background: white;
      border-radius: 16px;
      border: 1px dashed #cbd5e1;
      
      .empty-icon-wrap {
        width: 80px; height: 80px;
        background: #f8fafc;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        margin-bottom: 24px;
        
        mat-icon { font-size: 40px; width: 40px; height: 40px; color: #94a3b8; }
      }
      h2 { margin: 0 0 12px; font-size: 20px; font-weight: 700; color: var(--text-heading); }
      p { margin: 0; color: var(--text-muted); max-width: 400px; line-height: 1.5; }
      .mt-4 { margin-top: 32px; }
    }

    /* Animations */
    @keyframes fadeInSlideUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    
    .animate-fade-in {
      animation: fadeInSlideUp 0.6s ease-out backwards;
    }
    
    .animate-scale-in {
      animation: scaleIn 0.4s ease-out backwards;
    }

    /* Responsive adjustments */
    @media (max-width: 1400px) {
      .capabilities-grid { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 1000px) {
      .capabilities-grid { grid-template-columns: repeat(2, 1fr); }
      .features-page { padding: 32px; }
    }
    @media (max-width: 768px) {
      .capabilities-grid { grid-template-columns: 1fr; padding-left: 0; }
      .module-header { margin-bottom: 16px; }
      .features-page { padding: 16px; min-height: 100vh; }
      .header-section { flex-direction: column; align-items: flex-start; gap: 16px; }
      .module-row { padding: 24px 20px; }
    }
  `]
})
export class ManageFeaturesComponent implements OnInit {
  private featureService = inject(FeatureService);

  featureModules = signal<Feature[]>([]);
  isLoading = signal(false);

  ngOnInit() {
    this.loadFeatures();
  }

  loadFeatures() {
    this.isLoading.set(true);
    this.featureService.getActiveParentFeatures()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => this.featureModules.set(data),
        error: (err) => console.error('Failed to load features', err)
      });
  }

  getFlattenedSubFeatures(module: Feature): Feature[] {
    const flat: Feature[] = [];
    const collect = (f: Feature) => {
      if (f.subFeatures) {
        f.subFeatures.forEach(sub => {
          flat.push(sub);
          collect(sub);
        });
      }
    };
    collect(module);
    return flat;
  }
}
