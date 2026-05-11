import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ReportVerificationService } from '../../core/services/report-verification.service';
import { ReportVerificationDto } from '../../core/models/report-verification.dto';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { animate, style, transition, trigger } from '@angular/animations';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-report-verification',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule],
  template: `
    <div class="verification-page">
      <div class="background-glass"></div>
      
      <div class="content-wrapper" [@fadeIn]="'in'">
        <header class="verification-header">
           <div class="logo-box">
             <img src="assets/images/logo.png" alt="Logo" class="main-logo">
           </div>
           <h1>Department of Agriculture</h1>
           <p class="subtitle">Field Wing, Punjab</p>
        </header>

        <div class="status-card" *ngIf="isLoading()">
          <div class="loader-box">
             <mat-spinner diameter="40"></mat-spinner>
             <p>Verifying Report with Official Blockchain Record...</p>
          </div>
        </div>

        <div class="status-card success" *ngIf="!isLoading() && verificationData()?.isValid" [@slideUp]="'in'">
            <div class="status-ribbon"></div>
            <div class="icon-header">
               <div class="icon-circle">
                 <mat-icon>verified</mat-icon>
               </div>
               <div class="badge">OFFICIAL RECORD</div>
            </div>

            <h2 class="result-title">System Verified Successfully</h2>
            <p class="result-desc">The digital signature for this document matches our records.</p>
            
            <div class="verification-type" [class.qic]="verificationData()?.type === 'QIC'" [class.bill]="verificationData()?.type === 'BILL'" [class.dic]="verificationData()?.type === 'DIC'">
              {{ verificationData()?.type }} VERIFICATION
            </div>

            <div class="details-grid">
              <div class="detail-item full" *ngIf="verificationData()?.reportNumber">
                <span class="label">Report Number</span>
                <span class="value mono">#{{ verificationData()?.reportNumber }}</span>
              </div>
              <div class="detail-item full" *ngIf="verificationData()?.applicationNumber">
                <span class="label">Application ID</span>
                <span class="value mono">#{{ verificationData()?.applicationNumber }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Farmer Name</span>
                <span class="value">{{ verificationData()?.farmerName || 'Multiple Allotees' }}</span>
              </div>
              <div class="detail-item" *ngIf="verificationData()?.farmerCnic">
                <span class="label">Farmer CNIC</span>
                <span class="value">{{ verificationData()?.farmerCnic }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Firm Name</span>
                <span class="value">{{ verificationData()?.firmName || 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Machine / Implement</span>
                <span class="value">{{ verificationData()?.implementName || 'Multiple Units' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">District</span>
                <span class="value">{{ verificationData()?.districtName || 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Verification Date</span>
                <span class="value">{{ today | date:'medium' }}</span>
              </div>
            </div>

            <div class="summary-box" *ngIf="verificationData()?.type === 'QIC' || verificationData()?.type === 'BILL'">
               <div class="summary-header">Batch Summary</div>
               <div class="stat-row">
                 <span>Total Machines</span>
                 <strong>{{ verificationData()?.totalApps || 0 }}</strong>
               </div>
               <div class="stat-row passed">
                 <span>Passed Units</span>
                 <strong>{{ verificationData()?.passedCount || 0 }}</strong>
               </div>
               <div class="stat-row rejected" *ngIf="verificationData()?.rejectedCount">
                 <span>Deferred Units</span>
                 <strong>{{ verificationData()?.rejectedCount || 0 }}</strong>
               </div>
            </div>

            <div class="disclaimer">
               <mat-icon>security</mat-icon>
               <span>This is a digitally generated verification record for authenticated machinery delivery.</span>
            </div>
        </div>

        <!-- CNIC PROMPT CARD -->
        <div class="status-card cnic-prompt" *ngIf="!isLoading() && verificationData()?.requiresCnic" [@slideUp]="'in'">
            <div class="icon-header">
               <div class="icon-circle cnic">
                 <mat-icon>fingerprint</mat-icon>
               </div>
               <div class="badge cnic">SECURITY STEP</div>
            </div>
            <h2 class="result-title">Identify Farmer</h2>
            <p class="result-desc">To proceed with verification, please enter the Farmer's CNIC number associated with this application.</p>
            
            <div class="cnic-form">
               <mat-form-field appearance="outline" class="full-width">
                 <mat-label>Farmer CNIC</mat-label>
                 <input matInput [(ngModel)]="cnicInput" name="cnic" placeholder="e.g. 3520112345678" maxlength="15" (keyup.enter)="verifyWithCnic()">
                 <mat-icon matPrefix>badge</mat-icon>
               </mat-form-field>
               
               <button mat-flat-button class="verify-btn" (click)="verifyWithCnic()" [disabled]="!cnicInput() || cnicInput().length < 10">
                 <mat-icon>verified_user</mat-icon>
                 SEARCH & VERIFY
               </button>
            </div>
        </div>

        <div class="status-card error" *ngIf="!isLoading() && !verificationData()?.isValid && !verificationData()?.requiresCnic" [@slideUp]="'in'">
            <div class="icon-header">
               <div class="icon-circle error">
                 <mat-icon>report_problem</mat-icon>
               </div>
               <div class="badge error">INVALID RECORD</div>
            </div>
            <h2 class="result-title">Record Not Found</h2>
            <p class="result-desc">The scanned QR code does not correspond to a valid system record or report at this time.</p>
            <div class="support-footer">
               <p>Please contact Department Office for assistance.</p>
            </div>
        </div>

        <footer class="page-footer">
           <img src="assets/images/cm-logo.png" alt="CM Punjab" class="cm-logo">
           <p>© 2026 Punjab Clean Air Program - PCAP</p>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    @keyframes pulse {
      0% { transform: scale(1); opacity: 0.8; }
      50% { transform: scale(1.1); opacity: 0.4; }
      100% { transform: scale(1); opacity: 0.8; }
    }

    .verification-page {
      position: relative; min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 40px 20px; overflow: hidden; background: #0f172a; font-family: 'Inter', sans-serif;
    }

    .background-glass {
      position: absolute; top: -10%; right: -10%; width: 60%; height: 60%;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0) 70%);
      border-radius: 50%; filter: blur(100px);
    }

    .content-wrapper {
      position: relative; z-index: 10; width: 100%; max-width: 500px;
      display: flex; flex-direction: column; gap: 30px;
    }

    .verification-header {
      text-align: center; color: white;
      .logo-box { margin-bottom: 20px; }
      .main-logo { height: 70px; filter: drop-shadow(0 0 15px rgba(255,255,255,0.1)); }
      h1 { margin: 0; font-size: 26px; font-weight: 950; letter-spacing: -0.5px; }
      .subtitle { margin: 5px 0 0; font-size: 14px; opacity: 0.7; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; }
    }

    .status-card {
      background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px);
      border-radius: 32px; padding: 40px; box-shadow: 0 40px 80px rgba(0,0,0,0.3);
      position: relative; overflow: hidden; border: 1px solid rgba(255,255,255,0.2);
    }

    .loader-box {
      display: flex; flex-direction: column; align-items: center; gap: 20px; text-align: center;
      p { color: #64748b; font-weight: 600; font-size: 15px; margin: 0; }
    }

    .status-ribbon {
      position: absolute; top: 0; left: 0; right: 0; height: 10px;
      background: linear-gradient(90deg, #10b981, #34d399);
    }

    .icon-header {
      display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;
      .icon-circle {
        width: 70px; height: 70px; background: #ecfdf5; color: #10b981; border-radius: 20px;
        display: flex; align-items: center; justify-content: center;
        mat-icon { font-size: 40px; width: 40px; height: 40px; }
        &.error { background: #fef2f2; color: #ef4444; }
      }
      .badge {
        padding: 8px 16px; background: #10b981; color: white; border-radius: 12px;
        font-size: 11px; font-weight: 900; letter-spacing: 0.5px;
        &.error { background: #ef4444; }
      }
    }

    .result-title { margin: 0; font-size: 26px; font-weight: 950; color: #0f172a; }
    .result-desc { margin: 10px 0 30px; font-size: 15px; color: #64748b; font-weight: 500; }

    .verification-type {
      display: inline-block; padding: 10px 20px; border-radius: 12px; margin-bottom: 30px;
      font-size: 14px; font-weight: 900; letter-spacing: 1px;
      &.qic { background: #eff6ff; color: #3b82f6; }
      &.bill { background: #f0fdf4; color: #10b981; }
      &.dic { background: #eef2ff; color: #6366f1; }
    }

    .details-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;
      .detail-item {
        display: flex; flex-direction: column; gap: 4px;
        .label { font-size: 10px; font-weight: 750; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
        .value { font-size: 14px; font-weight: 800; color: #1e293b; }
        .mono { font-family: 'JetBrains Mono', monospace; color: #0f172a; }
        &.full { grid-column: span 2; }
      }
    }

    .summary-box {
       background: #f8fafc; border-radius: 20px; padding: 20px; margin-bottom: 30px; border: 1px solid #e2e8f0;
       .summary-header { font-size: 12px; font-weight: 900; color: #64748b; margin-bottom: 15px; text-transform: uppercase; }
       .stat-row {
         display: flex; justify-content: space-between; padding: 10px 0; border-top: 1px dashed #cbd5e1;
         span { font-size: 14px; font-weight: 600; color: #64748b; }
         strong { font-size: 14px; font-weight: 900; color: #0f172a; }
         &.passed strong { color: #10b981; }
         &.rejected strong { color: #ef4444; }
         &:first-of-type { border-top: none; }
       }
    }

    .disclaimer {
       display: flex; gap: 12px; align-items: center; color: #94a3b8; padding-top: 20px; border-top: 1px solid #e2e8f0;
       mat-icon { font-size: 20px; width: 20px; height: 20px; opacity: 0.5; }
       span { font-size: 11px; font-weight: 500; font-style: italic; line-height: 1.4; }
    }

    .status-card.error {
      .result-title { color: #ef4444; }
      .support-footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #fee2e2; color: #94a3b8; font-size: 13px; font-weight: 600; text-align: center; }
    }

    .cnic-prompt {
      .icon-circle.cnic { background: #fff7ed; color: #f97316; }
      .badge.cnic { background: #f97316; }
      .cnic-form { 
        display: flex; flex-direction: column; gap: 15px; margin-top: 20px;
        .full-width { width: 100%; }
        ::ng-deep .mat-mdc-text-field-wrapper { background: #f8fafc !important; }
        .verify-btn { 
          height: 56px; border-radius: 16px; font-weight: 900; letter-spacing: 1px;
          background: #0f172a !important; color: white !important;
          mat-icon { margin-right: 8px; }
        }
      }
    }

    .page-footer {
      text-align: center; color: rgba(255,255,255,0.4);
      .cm-logo { height: 40px; opacity: 0.3; margin-bottom: 10px; }
      p { font-size: 12px; font-weight: 600; margin: 0; }
    }
  `],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('0.6s ease-out', style({ opacity: 1 }))
      ])
    ]),
    trigger('slideUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(40px)' }),
        animate('0.5s cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class ReportVerificationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private verificationService = inject(ReportVerificationService);

  verificationData = signal<ReportVerificationDto | null>(null);
  isLoading = signal(true);
  today = new Date();
  cnicInput = signal('');

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const type = params['type'];
      const id = params['id'];

      if (!type || !id) {
        this.isLoading.set(false);
        this.verificationData.set({ isValid: false, type: 'QIC' });
        return;
      }

      this.verify(type, id);
    });
  }

  verifyWithCnic(): void {
    const params = this.route.snapshot.queryParams;
    const type = params['type'];
    const id = params['id'];
    if (type && id && this.cnicInput()) {
      this.verify(type, id, this.cnicInput());
    }
  }

  verify(type: string, id: string, cnic?: string): void {
    this.isLoading.set(true);
    let obs$;

    if (type === 'QIC') {
      obs$ = this.verificationService.verifyQic(id);
    } else if (type === 'BILL') {
      obs$ = this.verificationService.verifyBill(id);
    } else if (type === 'DIC' || type === 'ALLOTMENT') {
      obs$ = this.verificationService.verifyDic(id, cnic);
    } else {
      this.isLoading.set(false);
      this.verificationData.set({ isValid: false, type: 'QIC' });
      return;
    }

    obs$.subscribe({
      next: (data) => {
        this.verificationData.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Verification failed', err);
        this.verificationData.set({ isValid: false, type: type as any });
        this.isLoading.set(false);
      }
    });
  }
}
