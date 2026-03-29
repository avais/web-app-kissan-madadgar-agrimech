import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-confirm-qic-request-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirm-dialog luxe-theme">
      <div class="dialog-header">
        <mat-icon class="warn-icon">priority_high</mat-icon>
        <h2>{{ data.title }}</h2>
      </div>
      
      <div class="dialog-content">
        <p [innerHTML]="data.message"></p>
        
        <div class="convener-card" *ngIf="data.convener">
          <div class="card-label">Designated Convener</div>
          <div class="convener-details">
            <mat-icon>account_circle</mat-icon>
            <div class="info">
              <div class="name">{{ data.convener.firstName }} {{ data.convener.lastName }}</div>
              <div class="designation">{{ data.convener.designation || 'Director Agriculture Engineering' }}</div>
              <div class="email">{{ data.convener.username }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="dialog-actions">
        <button mat-button (click)="onCancel()" class="cancel-btn">
          {{ data.cancelText || 'Cancel' }}
        </button>
        <button mat-flat-button color="primary" (click)="onConfirm()" class="confirm-btn">
          <mat-icon>send</mat-icon>
          {{ data.confirmText || 'Confirm & Send' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .confirm-dialog {
      padding: 24px;
      max-width: 450px;
      font-family: 'Inter', sans-serif;
    }
    .dialog-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
      .warn-icon {
        color: #f59e0b;
        background: #fef3c7;
        width: 48px;
        height: 48px;
        font-size: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
      }
      h2 { margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; }
    }
    .dialog-content {
      color: #475569;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .convener-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 16px;
      margin-top: 20px;
      .card-label {
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        color: #64748b;
        margin-bottom: 12px;
        letter-spacing: 0.5px;
      }
      .convener-details {
        display: flex;
        gap: 16px;
        align-items: center;
        mat-icon { font-size: 32px; width: 32px; height: 32px; color: #94a3b8; }
        .info {
          .name { font-size: 15px; font-weight: 700; color: #1e293b; }
          .designation { font-size: 12px; color: #64748b; }
          .email { font-size: 12px; color: #3b82f6; font-weight: 600; }
        }
      }
    }
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      .cancel-btn { font-weight: 700; color: #64748b; }
      .confirm-btn {
        background: #10b981;
        color: white;
        font-weight: 700;
        border-radius: 10px;
        mat-icon { margin-right: 8px; font-size: 18px; width: 18px; height: 18px; }
      }
    }
  `]
})
export class ConfirmQICRequestDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmQICRequestDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onCancel() { this.dialogRef.close(false); }
  onConfirm() { this.dialogRef.close(true); }
}
