import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  icon: string;
  iconColor: string;
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirm-dialog-wrap">
      <div class="header">
        <div class="icon-orb" [style.background-color]="data.iconColor + '15'" [style.color]="data.iconColor">
          <mat-icon>{{ data.icon || 'help_outline' }}</mat-icon>
        </div>
        <h2 mat-dialog-title>{{ data.title }}</h2>
      </div>
      
      <mat-dialog-content>
        <p class="message">{{ data.message }}</p>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()" class="cancel-btn">{{ data.cancelText || 'Cancel' }}</button>
        <button mat-flat-button [style.background-color]="data.iconColor" class="confirm-btn" (click)="onConfirm()">
          {{ data.confirmText || 'Confirm' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-dialog-wrap {
      padding: 16px;
      min-width: 320px;
    }
    .header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 20px;
    }
    .icon-orb {
      width: 64px;
      height: 64px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      mat-icon { font-size: 32px; width: 32px; height: 32px; }
    }
    h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      color: #1e293b;
      letter-spacing: -0.5px;
    }
    .message {
      color: #64748b;
      font-size: 14px;
      line-height: 1.6;
      text-align: center;
      margin: 0;
    }
    mat-dialog-actions {
      margin-top: 24px;
      padding: 0;
      gap: 12px;
      button {
        flex: 1;
        height: 44px;
        border-radius: 12px;
        font-weight: 700;
        font-size: 14px;
      }
      .cancel-btn { color: #94a3b8; }
      .confirm-btn { color: white; }
    }
  `]
})
export class ConfirmationDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
