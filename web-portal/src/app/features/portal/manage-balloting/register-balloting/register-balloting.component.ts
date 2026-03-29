import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { RouterModule, Router } from '@angular/router';
import { BallotingService } from '../../../../core/services/balloting.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-register-balloting',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    RouterModule
  ],
  template: `
    <div class="registration-container" [class.blur-content]="isSelecting()">
      <div class="form-header">
        <button mat-icon-button routerLink="/portal/balloting" class="back-btn">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="header-text">
          <h1>Initialize Balloting</h1>
          <p>Configure and launch the computerized selection algorithm for beneficiaries.</p>
        </div>
      </div>

      <div class="form-card-container">
        <mat-card class="premium-form-card">
          <form [formGroup]="ballotingForm" (ngSubmit)="onStartSelection()">
            <div class="form-grid">
              
              <div class="form-field-group">
                <label>Fiscal Period</label>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Balloting Year</mat-label>
                  <mat-select formControlName="ballotingYear">
                    <mat-option value="2023-24">2023-24</mat-option>
                    <mat-option value="2024-25">2024-25</mat-option>
                    <mat-option value="2025-26">2025-26</mat-option>
                  </mat-select>
                  <mat-icon matPrefix>calendar_today</mat-icon>
                  <mat-error *ngIf="ballotingForm.get('ballotingYear')?.hasError('required')">Fiscal year is required</mat-error>
                </mat-form-field>
              </div>

              <div class="form-field-group">
                <label>Allocation Stream</label>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Balloting Category</mat-label>
                  <mat-select formControlName="category">
                    <mat-option value="SMALL_FARMER">Small Farmer (Under 12.5 Acres)</mat-option>
                    <mat-option value="TRANSFORMER">Transformative Agriculture</mat-option>
                    <mat-option value="SMOG_CONTROL">Smog Control Program</mat-option>
                    <mat-option value="WOMEN_FARMER">Women Empower Program</mat-option>
                  </mat-select>
                  <mat-icon matPrefix>category</mat-icon>
                  <mat-error *ngIf="ballotingForm.get('category')?.hasError('required')">Category is required</mat-error>
                </mat-form-field>
              </div>

              <div class="form-field-group">
                <label>Quota Definition</label>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Total Beneficiaries</mat-label>
                  <input matInput type="number" formControlName="totalBeneficiaries" placeholder="e.g. 500">
                  <mat-icon matPrefix>groups</mat-icon>
                  <mat-hint>Number of applicants to be selected randomly</mat-hint>
                  <mat-error *ngIf="ballotingForm.get('totalBeneficiaries')?.hasError('required')">Quota limit is required</mat-error>
                  <mat-error *ngIf="ballotingForm.get('totalBeneficiaries')?.hasError('min')">Quota must be at least 1</mat-error>
                </mat-form-field>
              </div>

              <div class="form-field-group full-row">
                <label>Process Description (Internal Only)</label>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Description</mat-label>
                  <textarea matInput formControlName="description" rows="4" placeholder="Mention special instructions or batch notes..."></textarea>
                  <mat-icon matPrefix>notes</mat-icon>
                </mat-form-field>
              </div>
            </div>

            <div class="form-actions">
              <button mat-button type="button" routerLink="/portal/balloting">Cancel</button>
              <button mat-flat-button color="primary" class="submit-btn" [disabled]="ballotingForm.invalid || isLoading()">
                <mat-icon *ngIf="!isLoading()">play_circle_filled</mat-icon>
                <mat-spinner diameter="20" *ngIf="isLoading()"></mat-spinner>
                <span>{{ isLoading() ? 'Running Algorithm...' : 'Initialize & Run Balloting' }}</span>
              </button>
            </div>
          </form>
        </mat-card>

        <!-- Algorithm Info Card -->
        <mat-card class="info-sidebar">
          <div class="info-header">
            <mat-icon>security</mat-icon>
            <h3>Computerized Selection</h3>
          </div>
          <p>By initializing this process, the system will:</p>
          <ul class="process-steps">
            <li>
              <mat-icon>search</mat-icon>
              <span>Scan all "Eligible" applications for the selected category.</span>
            </li>
            <li>
              <mat-icon>shuffle</mat-icon>
              <span>Apply Fisher-Yates randomization to ensure absolute transparency.</span>
            </li>
            <li>
              <mat-icon>verified</mat-icon>
              <span>Auto-transfer top {{ ballotingForm.get('totalBeneficiaries')?.value || 'N' }} applicants to "Balloted" status.</span>
            </li>
          </ul>
          <div class="security-badge">
            <mat-icon>lock</mat-icon>
            <span>SHA-256 Seeded Randomization enabled.</span>
          </div>
        </mat-card>
      </div>
    </div>

    <!-- Selection Animation Overlay -->
    <div class="selection-overlay" *ngIf="isSelecting()">
      <div class="algorithm-visualizer">
        <div class="matrix-bg"></div>
        <div class="visualizer-content">
          <div class="rolling-dice">
            <mat-icon class="dice-icon spinning">casino</mat-icon>
          </div>
          <div class="logic-flow">
            <span class="step-label">{{ currentStep() }}</span>
            <div class="number-rolling">
               <span class="rolling-digit">{{ rollingId() }}</span>
            </div>
          </div>
          <h2>Selection in Progress</h2>
          <p>The system is currently scanning {{ ballotingForm.get('totalBeneficiaries')?.value }} candidates...</p>
          
          <div class="progress-bar-container">
             <div class="progress-fill" [style.width.%]="selectionProgress()"></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .registration-container { padding: 40px; background: #fdfbf7; min-height: 100vh; transition: filter 0.5s ease; }
    .blur-content { filter: blur(8px) grayscale(100%); pointer-events: none; }
    
    .form-header {
      display: flex; align-items: center; gap: 24px; margin-bottom: 40px;
      .back-btn { background: white; border: 1.5px solid #e2e8f0; color: #64748b; }
      h1 { margin: 0; font-size: 32px; font-weight: 900; color: #0f172a; letter-spacing: -1px; }
      p { margin: 4px 0 0; color: #64748b; font-size: 15px; font-weight: 500; }
    }

    .form-card-container { display: grid; grid-template-columns: 1.5fr 1fr; gap: 32px; max-width: 1200px; }

    .premium-form-card {
      padding: 40px; border-radius: 28px; border: 1px solid #f1f5f9; box-shadow: 0 10px 40px rgba(0,0,0,0.03); background: white !important;
    }

    .form-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
    .form-field-group {
      label { display: block; font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
    }
    .full-width { width: 100%; }
    .full-row { grid-column: span 1; }

    .form-actions {
      margin-top: 40px; padding-top: 32px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 20px;
      .submit-btn {
        height: 52px; padding: 0 32px; border-radius: 14px; font-weight: 700; background: #10b981 !important; color: white !important;
        display: flex; align-items: center; gap: 10px;
        &:disabled { background: #e2e8f0 !important; color: #94a3b8 !important; }
      }
    }

    .info-sidebar {
      padding: 32px; border-radius: 28px; background: #1e293b; color: white; border: none;
      .info-header {
        display: flex; align-items: center; gap: 12px; margin-bottom: 24px;
        mat-icon { color: #10b981; }
        h3 { margin: 0; font-size: 18px; font-weight: 800; }
      }
      p { color: #94a3b8; line-height: 1.6; font-size: 14px; }
    }

    .process-steps {
      list-style: none; padding: 0; margin: 32px 0;
      li {
        display: flex; align-items: flex-start; gap: 16px; margin-bottom: 24px;
        mat-icon { color: #10b98140; font-size: 20px; width: 20px; height: 20px; }
        span { font-size: 14px; font-weight: 600; color: #cbd5e1; }
      }
    }

    .security-badge {
      display: flex; align-items: center; gap: 8px; background: rgba(16, 185, 129, 0.1); padding: 12px 20px; border-radius: 12px;
      mat-icon { color: #10b981; font-size: 18px; width: 18px; height: 18px; }
      span { font-size: 12px; font-weight: 700; color: #10b981; text-transform: uppercase; letter-spacing: 0.5px; }
    }

    ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none !important; }

    .selection-overlay {
      position: fixed; inset: 0; z-index: 9999; background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center;
    }

    .algorithm-visualizer {
      width: 600px; text-align: center; color: white; position: relative;
      .visualizer-content { position: relative; z-index: 10; }
      .matrix-bg { position: absolute; inset: -100px; opacity: 0.1; background: url('https://www.transparenttextures.com/patterns/carbon-fibre.png'); }
    }

    .dice-icon { font-size: 80px; width: 80px; height: 80px; color: #10b981; filter: drop-shadow(0 0 20px #10b981); }
    .spinning { animation: dice-spin 0.6s infinite alternate cubic-bezier(0.4, 0, 0.2, 1); }

    @keyframes dice-spin { 
      0% { transform: rotate(0) scale(1); }
      100% { transform: rotate(180deg) scale(1.2); }
    }

    .logic-flow {
      margin: 40px 0;
      .step-label { display: block; font-size: 11px; font-weight: 800; color: #10b981; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 12px; }
      .number-rolling { font-family: 'Courier New', monospace; font-size: 48px; font-weight: 900; color: white; letter-spacing: 2px; }
    }

    .progress-bar-container { 
      height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-top: 32px; overflow: hidden;
      .progress-fill { height: 100%; background: #10b981; transition: width 0.1s linear; box-shadow: 0 0 10px #10b981; }
    }

    h2 { font-size: 32px; font-weight: 900; margin-bottom: 8px; color: white !important; }
    p { color: #94a3b8; font-weight: 500; }
  `]
})
export class RegisterBallotingComponent {
  private fb = inject(FormBuilder);
  private ballotingService = inject(BallotingService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  ballotingForm: FormGroup;
  isLoading = signal(false);

  // Selection Animation Signals
  isSelecting = signal(false);
  selectionProgress = signal(0);
  currentStep = signal('IDLE');
  rollingId = signal('PRO-00000');

  private steps = [
    'Initializing Core...',
    'Scanning Candidate Pool...',
    'Running Fisher-Yates Randomization...',
    'Assigning Winners...',
    'Finalizing Blockchain Proof...'
  ];

  constructor() {
    this.ballotingForm = this.fb.group({
      ballotingYear: ['2024-25', Validators.required],
      category: ['', Validators.required],
      totalBeneficiaries: ['', [Validators.required, Validators.min(1)]],
      description: ['']
    });
  }

  onStartSelection() {
    if (this.ballotingForm.invalid) return;

    this.isSelecting.set(true);
    this.selectionProgress.set(0);

    // Start Simulation Timer
    let progress = 0;
    const interval = setInterval(() => {
      progress += 1;
      this.selectionProgress.set(progress);

      // Update Step based on progress
      const stepIdx = Math.floor((progress / 100) * this.steps.length);
      this.currentStep.set(this.steps[Math.min(stepIdx, this.steps.length - 1)]);

      // Roll IDs randomly
      const rand = Math.floor(10000 + Math.random() * 90000);
      this.rollingId.set(`PRO-${rand}`);

      if (progress >= 100) {
        clearInterval(interval);
        this.onSubmit(); // Actually call the API
      }
    }, 50); // 5 seconds total (100 * 50ms)
  }

  onSubmit() {
    if (this.ballotingForm.valid) {
      this.isLoading.set(true);
      this.ballotingService.create(this.ballotingForm.value)
        .pipe(finalize(() => {
          this.isLoading.set(false);
          this.isSelecting.set(false);
        }))
        .subscribe({
          next: () => {
            this.snackBar.open('Balloting initiated successfully!', 'Close', { duration: 3000 });
            this.router.navigate(['/portal/balloting']);
          },
          error: (err) => {
            console.error(err);
            this.snackBar.open('Critical error initializing algorithm. Contact admin.', 'Close', { duration: 5000 });
          }
        });
    }
  }
}
