import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-deferral-remarks-dialog',
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
    <div class="qic-dialog deferral-theme">
      <div class="dialog-header">
        <mat-icon class="warn-icon">cancel</mat-icon>
        <h2>Deferral Remarks</h2>
        <p>Please specify why this application is being deferred</p>
      </div>

      <div class="dialog-content">
        <div class="app-summary">
            <div class="sum-item">
                <span class="label">APPLICATION NO</span>
                <b>{{ data.applicationNumber }}</b>
            </div>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Deferral Reason</mat-label>
          <textarea matInput 
                    [(ngModel)]="remarks" 
                    placeholder="Enter detailed reason for deferral..." 
                    rows="4"
                    required 
                    autofocus></textarea>
          <mat-icon matSuffix>edit_note</mat-icon>
          <mat-hint>This information will be part of the official audit trail</mat-hint>
        </mat-form-field>
      </div>

      <div class="dialog-actions">
        <button mat-button (click)="onCancel()" class="cancel-btn">Back</button>
        <button mat-flat-button 
                class="confirm-btn"
                [disabled]="!remarks().trim()" 
                (click)="onConfirm()">
          <mat-icon>block</mat-icon>
          Confirm Deferral
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
      
      .warn-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #ef4444;
        margin-bottom: 12px;
        background: #fef2f2;
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
        background: #f8fafc;
        padding: 12px 16px;
        border-radius: 12px;
        margin-bottom: 24px;
        border: 1px solid #f1f5f9;

        .sum-item {
            display: flex;
            flex-direction: column;
            .label { font-size: 11px; font-weight: 700; color: #94a3b8; letter-spacing: 0.5px; }
            b { font-size: 14px; color: #1e293b; }
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

      .cancel-btn { font-weight: 700; color: #64748b; }

      .confirm-btn {
          height: 48px;
          padding: 0 24px;
          border-radius: 12px;
          font-weight: 800;
          background: #ef4444;
          color: white;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
          
          mat-icon { margin-right: 8px; font-size: 20px; width: 20px; height: 20px; }
          
          &:disabled { background: #fca5a5; opacity: 1; }
      }
    }
  `]
})
export class DeferralRemarksDialogComponent {
    dialogRef = inject(MatDialogRef<DeferralRemarksDialogComponent>);
    data = inject(MAT_DIALOG_DATA);

    remarks = signal<string>('');

    onCancel() {
        this.dialogRef.close();
    }

    onConfirm() {
        if (this.remarks().trim()) {
            this.dialogRef.close(this.remarks().trim());
        }
    }
}
