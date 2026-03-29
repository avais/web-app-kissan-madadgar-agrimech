import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-qic-request-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FormsModule,
    MatIconModule
  ],
  template: `
    <div class="qic-dialog">
      <div class="dialog-header">
        <mat-icon>satellite_alt</mat-icon>
        <h2>Request Quality Inspection</h2>
        <p>Assign a tracking terminal to this application to proceed</p>
      </div>

      <div class="dialog-content">
        <div class="app-summary">
            <div class="sum-item">
                <span class="label">Application No</span>
                <b>{{ data.applicationNumber }}</b>
            </div>
            <div class="sum-item">
                <span class="label">Farmer</span>
                <b>{{ data.farmerName }}</b>
            </div>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Tracker IMEI Number</mat-label>
          <input matInput [(ngModel)]="imei" placeholder="Enter 15-digit IMEI..." required autofocus>
          <mat-icon matSuffix>qr_code_scanner</mat-icon>
          <mat-hint>Enter the IMEI number of the tracker installed on the implement</mat-hint>
        </mat-form-field>
      </div>

      <div class="dialog-actions">
        <button mat-button (click)="onCancel()" [disabled]="isSubmitting()">Cancel</button>
        <button mat-flat-button color="primary" 
                class="save-btn"
                [disabled]="!imei() || isSubmitting()" 
                (click)="onSave()">
          <mat-icon *ngIf="!isSubmitting()">save</mat-icon>
          <span *ngIf="!isSubmitting()">Save & Request QIC</span>
          <span *ngIf="isSubmitting()">Processing...</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .qic-dialog {
      padding: 24px;
      max-width: 450px;
      font-family: 'Outfit', 'Inter', sans-serif;
    }

    .dialog-header {
      text-align: center;
      margin-bottom: 32px;
      
      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #3b82f6;
        margin-bottom: 12px;
        background: #eff6ff;
        padding: 12px;
        border-radius: 20px;
      }
      
      h2 {
        font-size: 24px;
        font-weight: 800;
        color: #1e293b;
        margin: 0 0 8px;
      }
      
      p {
        color: #64748b;
        font-size: 14px;
        margin: 0;
      }
    }

    .app-summary {
        display: flex;
        gap: 20px;
        background: #f8fafc;
        padding: 16px;
        border-radius: 12px;
        margin-bottom: 24px;
        border: 1px solid #f1f5f9;

        .sum-item {
            display: flex;
            flex-direction: column;
            .label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
            b { font-size: 13px; color: #334155; }
        }
    }

    .full-width {
      width: 100%;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #f1f5f9;

      .save-btn {
          height: 48px;
          padding: 0 24px;
          border-radius: 12px;
          font-weight: 700;
          background: #3b82f6;
          
          mat-icon { margin-right: 8px; font-size: 20px; width: 20px; height: 20px; }
      }
    }

    :host ::ng-deep {
        .mat-mdc-button { border-radius: 12px; font-weight: 600; padding: 0 20px; }
    }
  `]
})
export class QicRequestDialogComponent {
  dialogRef = inject(MatDialogRef<QicRequestDialogComponent>);
  data = inject(MAT_DIALOG_DATA);

  imei = signal<string>('');
  isSubmitting = signal<boolean>(false);

  onCancel() {
    this.dialogRef.close();
  }

  onSave() {
    if (this.imei()) {
      this.dialogRef.close(this.imei());
    }
  }
}
