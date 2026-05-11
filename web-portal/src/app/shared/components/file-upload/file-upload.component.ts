import { Component, EventEmitter, Input, Output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatProgressBarModule, MatSnackBarModule],
  template: `
    <div class="file-upload-container" [class.dragging]="isDragging()" (dragover)="onDragOver($event)" (dragleave)="onDragLeave()" (drop)="onDrop($event)">
      <div class="upload-zone" *ngIf="!selectedFile()">
        <mat-icon class="upload-icon">cloud_upload</mat-icon>
        <div class="upload-text">
          <span class="main-text">Click or drag file to upload</span>
          <span class="sub-text">Support for PDF, JPG, PNG (Max 50MB)</span>
        </div>
        <input type="file" #fileInput (change)="onFileSelected($event)" hidden [accept]="accept">
        <button mat-stroked-button color="primary" type="button" (click)="fileInput.click()">Select File</button>
      </div>

      <div class="selected-file" *ngIf="selectedFile()">
        <div class="file-info">
          <mat-icon class="file-icon">description</mat-icon>
          <div class="text-info">
            <span class="file-name">{{ selectedFile()?.name }}</span>
            <span class="file-size">{{ (selectedFile()?.size || 0) / 1024 / 1024 | number:'1.1-2' }} MB</span>
          </div>
        </div>
        <button mat-icon-button color="warn" type="button" (click)="clearFile()">
          <mat-icon>cancel</mat-icon>
        </button>
      </div>

      <mat-progress-bar mode="determinate" [value]="progress" *ngIf="isUploading"></mat-progress-bar>
    </div>
  `,
  styles: [`
    .file-upload-container {
      border: 2px dashed #e2e8f0;
      border-radius: 12px;
      padding: 14px;
      background: #f8fafc;
      transition: all 0.3s ease;
      position: relative;
      margin: 6px 0;

      &.dragging {
        border-color: #3b82f6;
        background: #eff6ff;
      }
    }

    .upload-zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      text-align: center;

      .upload-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: #94a3b8;
      }

      .upload-text {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .main-text {
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
        }

        .sub-text {
          font-size: 12px;
          color: #94a3b8;
        }
      }
    }

    .selected-file {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px;

      .file-info {
        display: flex;
        align-items: center;
        gap: 12px;

        .file-icon {
          color: #3b82f6;
          font-size: 32px;
          width: 32px;
          height: 32px;
        }

        .text-info {
          display: flex;
          flex-direction: column;

          .file-name {
            font-size: 14px;
            font-weight: 700;
            color: #1e293b;
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .file-size {
            font-size: 12px;
            color: #94a3b8;
          }
        }
      }
    }

    mat-progress-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 4px;
      border-bottom-left-radius: 16px;
      border-bottom-right-radius: 16px;
    }
  `]
})
export class FileUploadComponent {
  @Input() accept = '.pdf,.jpg,.jpeg,.png';
  @Input() progress = 0;
  @Input() isUploading = false;
  @Output() fileSelected = new EventEmitter<File | null>();

  private snackBar = inject(MatSnackBar);
  readonly MAX_SIZE = 50 * 1024 * 1024; // 50MB

  selectedFile = signal<File | null>(null);
  isDragging = signal(false);

  onFileSelected(event: any) {
    const file = event.target.files[0];
    this.handleFile(file);
  }

  private handleFile(file: File | undefined) {
    if (!file) return;

    if (file.size > this.MAX_SIZE) {
      this.snackBar.open('File size exceeds 5MB limit. Please choose a smaller file.', 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      this.clearFile();
      return;
    }

    this.selectedFile.set(file);
    this.fileSelected.emit(file);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave() {
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const file = event.dataTransfer?.files[0];
    this.handleFile(file);
  }

  clearFile() {
    this.selectedFile.set(null);
    this.fileSelected.emit(null);
  }
}
