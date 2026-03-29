import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-pass-confirmation-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
    template: `
    <div class="confirm-dialog pass-theme">
      <div class="dialog-header">
        <div class="icon-circle">
            <mat-icon>check_circle</mat-icon>
        </div>
        <h2>Approve Inspection?</h2>
        <p>Are you sure you want to pass this application?</p>
      </div>

      <div class="app-dossier">
        <div class="d-item">
            <label>APPLICATION</label>
            <b>#{{ data.applicationNumber }}</b>
        </div>
        <div class="d-item">
            <label>FARMER</label>
            <b>{{ data.farmerName }}</b>
        </div>
        <div class="d-item">
            <label>ID</label>
            <b class="uid">{{ data.uniqueImplementId || 'PENDING' }}</b>
        </div>
      </div>

      <div class="dialog-actions">
        <button mat-button (click)="onCancel()" class="cancel-btn">Cancel</button>
        <button mat-flat-button color="primary" class="confirm-btn" (click)="onConfirm()">
          <mat-icon>verified</mat-icon>
          Yes, Pass Inspection
        </button>
      </div>
    </div>
  `,
    styles: [`
    .confirm-dialog {
      padding: 32px;
      max-width: 400px;
      text-align: center;
      font-family: 'Outfit', 'Inter', sans-serif;
    }
    .icon-circle {
        width: 64px; height: 64px; background: #f0fdf4; color: #10b981;
        border-radius: 50%; display: flex; align-items: center; justify-content: center;
        margin: 0 auto 20px;
        mat-icon { font-size: 40px; width: 40px; height: 40px; }
    }
    h2 { font-size: 22px; font-weight: 800; color: #1e293b; margin: 0 0 8px; }
    p { color: #64748b; font-size: 15px; margin: 0; }

    .app-dossier {
        background: #f8fafc; border-radius: 16px; padding: 20px; margin: 24px 0;
        display: flex; flex-direction: column; gap: 12px; text-align: left;
        border: 1px solid #f1f5f9;
        .d-item {
            display: flex; justify-content: space-between; align-items: center;
            label { font-size: 10px; font-weight: 800; color: #94a3b8; letter-spacing: 0.5px; }
            b { font-size: 13px; color: #334155; }
            .uid { color: #10b981; font-weight: 800; }
        }
    }

    .dialog-actions {
        display: flex; gap: 12px;
        button { flex: 1; height: 48px; border-radius: 12px; font-weight: 750; }
        .cancel-btn { color: #64748b; }
        .confirm-btn { background: #10b981; color: white; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); }
    }
  `]
})
export class PassConfirmationDialogComponent {
    dialogRef = inject(MatDialogRef<PassConfirmationDialogComponent>);
    data = inject(MAT_DIALOG_DATA);

    onCancel() { this.dialogRef.close(false); }
    onConfirm() { this.dialogRef.close(true); }
}
