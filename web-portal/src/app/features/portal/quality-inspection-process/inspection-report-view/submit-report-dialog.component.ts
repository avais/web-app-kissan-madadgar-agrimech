import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-submit-report-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirm-dialog submit-theme">
      <div class="dialog-header">
        <div class="icon-circle" [class.approve]="data.mode === 'approve'">
            <mat-icon>{{ data.mode === 'approve' ? 'verified_user' : 'send' }}</mat-icon>
        </div>
        <h2>{{ data.mode === 'approve' ? 'Finalize & Approve Report?' : 'Submit QIC Report?' }}</h2>
        <p>{{ data.mode === 'approve' ? 'You are about to finalize this inspection report. This will update all application statuses.' : 'The signed document has been uploaded. Would you like to submit this report for final approval now?' }}</p>
      </div>

      <div class="report-summary">
        <div class="s-item">
            <label>REPORT NUMBER</label>
            <b>{{ data.reportNumber }}</b>
        </div>
        <div class="s-item">
            <label>TOTAL APPLICATIONS</label>
            <b>{{ data.totalApps }}</b>
        </div>
      </div>

      <div class="dialog-actions">
        <button mat-button (click)="onCancel()" class="cancel-btn">Cancel</button>
        <button mat-flat-button color="primary" class="confirm-btn" [class.approve]="data.mode === 'approve'" (click)="onConfirm()">
          <mat-icon>{{ data.mode === 'approve' ? 'check_circle' : 'verified' }}</mat-icon>
          {{ data.mode === 'approve' ? 'Yes, Approve Now' : 'Yes, Submit Now' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .confirm-dialog {
      padding: 32px;
      max-width: 450px;
      text-align: center;
      font-family: 'Outfit', 'Inter', sans-serif;
    }
    .submit-theme .icon-circle {
        width: 64px; height: 64px; background: #eff6ff; color: #3b82f6;
        border-radius: 50%; display: flex; align-items: center; justify-content: center;
        margin: 0 auto 20px;
        mat-icon { font-size: 32px; width: 32px; height: 32px; }
        &.approve { background: #ecfdf5; color: #10b981; }
    }
    h2 { font-size: 22px; font-weight: 800; color: #1e293b; margin: 0 0 12px; }
    p { color: #64748b; font-size: 15px; margin: 0; line-height: 1.6; }

    .report-summary {
        background: #f8fafc; border-radius: 16px; padding: 20px; margin: 24px 0;
        display: flex; flex-direction: column; gap: 12px; text-align: left;
        border: 1px solid #f1f5f9;
        .s-item {
            display: flex; justify-content: space-between; align-items: center;
            label { font-size: 10px; font-weight: 800; color: #94a3b8; letter-spacing: 0.5px; }
            b { font-size: 14px; color: #0f172a; font-weight: 800; }
        }
    }

    .dialog-actions {
        display: flex; gap: 12px;
        button { flex: 1; height: 52px; border-radius: 14px; font-weight: 800; }
        .cancel-btn { color: #64748b; }
        .confirm-btn { background: #3b82f6; color: white; box-shadow: 0 10px 20px -5px rgba(59, 130, 246, 0.3); }
        .confirm-btn.approve { background: #10b981; box-shadow: 0 10px 20px -5px rgba(16, 185, 129, 0.3); }
    }
  `]
})
export class SubmitReportDialogComponent {
  dialogRef = inject(MatDialogRef<SubmitReportDialogComponent>);
  data = inject(MAT_DIALOG_DATA);

  onCancel() { this.dialogRef.close(false); }
  onConfirm() { this.dialogRef.close(true); }
}
