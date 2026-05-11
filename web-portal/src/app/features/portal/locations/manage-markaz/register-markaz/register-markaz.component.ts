import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MarkazService } from '../../../../../core/services/markaz.service';
import { DistrictService, District } from '../../../../../core/services/district.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-register-tehsil',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    ReactiveFormsModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    HttpClientModule,
    RouterModule
  ],
  template: `
    <div class="register-container">
      <div class="header-section">
        <div class="title-info">
          <button mat-icon-button (click)="goBack()" class="back-btn">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div>
            <h1>{{isEditMode() ? 'Edit' : 'Register'}} Tehsil</h1>
            <p>Configure administrative details for the service area.</p>
          </div>
        </div>
        <div class="actions">
          <button mat-stroked-button (click)="goBack()">Cancel</button>
          <button mat-flat-button color="primary" class="save-btn" (click)="save()" [disabled]="tehsilForm.invalid || isSaving()">
            <mat-spinner diameter="20" *ngIf="isSaving()"></mat-spinner>
            <span *ngIf="!isSaving()">{{isEditMode() ? 'Update' : 'Register'}} Tehsil</span>
            <mat-icon *ngIf="!isSaving()">check_circle</mat-icon>
          </button>
        </div>
      </div>

      <div class="content-grid-simple">
        <!-- Center Card: Form Details -->
        <mat-card class="form-card">
          <div class="card-header">
            <mat-icon>info</mat-icon>
            <h2>Basic Information</h2>
          </div>
          <form [formGroup]="tehsilForm" class="tehsil-form">
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Select District</mat-label>
                <mat-select formControlName="districtId">
                  <mat-option *ngIf="isLoadingDistricts()" disabled>
                    <div class="loader-option">
                      <mat-spinner diameter="20"></mat-spinner>
                      <span>Fetching Districts...</span>
                    </div>
                  </mat-option>
                  <mat-option *ngFor="let dist of districts" [value]="dist.id">
                    {{dist.name}}
                  </mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Tehsil Code</mat-label>
                <input matInput formControlName="code" placeholder="e.g. MU-E-001">
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Tehsil Name (English)</mat-label>
                <input matInput formControlName="name" placeholder="e.g. Multan Tehsil East">
              </mat-form-field>
 
              <mat-form-field appearance="outline">
                <mat-label>Tehsil Name (Urdu)</mat-label>
                <input matInput formControlName="nameUrdu" placeholder="مثلاً ملتان تحصیل ایسٹ" class="urdu-input">
              </mat-form-field>
            </div>

            <div class="settings-panel">
              <div class="setting-item">
                <div class="info">
                  <span class="label">Operational Status</span>
                  <span class="desc">Active Tehsil will be visible in public reports.</span>
                </div>
                <mat-slide-toggle formControlName="active" color="primary"></mat-slide-toggle>
              </div>
            </div>
          </form>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .register-container {
      padding: 32px;
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 32px;
      animation: fadeIn 0.5s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .title-info {
        display: flex;
        align-items: center;
        gap: 16px;
        
        .back-btn {
          background: #fff;
          border: 1px solid #e2e8f0;
          color: #64748b;
          &:hover { background: #f8fafc; color: #1e293b; }
        }

        h1 { font-size: 32px; font-weight: 850; color: #0f172a; margin: 0; letter-spacing: -0.5px; }
        p { font-size: 15px; color: #64748b; margin: 4px 0 0; }
      }

      .actions {
        display: flex;
        gap: 12px;
        button { height: 48px; border-radius: 14px; font-weight: 700; padding: 0 24px; }
        .save-btn { 
          background: #4CAF50 !important; color: #fff; gap: 8px;
          &:disabled { background: #e2e8f0 !important; color: #94a3b8 !important; }
        }
      }
    }

    .content-grid-simple {
      display: flex;
      justify-content: center;
      gap: 32px;
      align-items: start;
    }

    .form-card {
      border-radius: 24px;
      border: none;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05);
      padding: 32px;
      width: 100%;
      max-width: 800px;

      .card-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 24px;
        mat-icon { color: #3b82f6; }
        h2 { margin: 0; font-size: 18px; font-weight: 700; color: #1e293b; }
      }
    }

    .tehsil-form {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      mat-form-field { width: 100%; }
      .urdu-input { font-family: 'Noto Sans Arabic', sans-serif; font-size: 17px; font-weight: 500; text-align: right; }
    }

    .settings-panel {
      background: #f8fafc;
      border-radius: 16px;
      padding: 20px;
      border: 1px solid #f1f5f9;
      margin-top: 8px;

      .setting-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        .info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          .label { font-weight: 700; color: #334155; font-size: 14px; }
          .desc { font-size: 12px; color: #64748b; }
        }
      }
    }
  `]
})
export class RegisterTehsilComponent implements OnInit {
  private fb = inject(FormBuilder);
  private districtService = inject(DistrictService);
  private markazService = inject(MarkazService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  tehsilForm: FormGroup;
  districts: District[] = [];
  isLoadingDistricts = signal(true);
  isSaving = signal(false);
  isEditMode = signal(false);
  tehsilId = signal<number | null>(null);
  isLoading = signal(false);

  constructor() {
    this.tehsilForm = this.fb.group({
      districtId: ['', Validators.required],
      name: ['', Validators.required],
      nameUrdu: ['', Validators.required],
      code: ['', Validators.required],
      latitude: [null],
      longitude: [null],
      boundary: [null],
      active: [true]
    });
  }

  ngOnInit() {
    this.loadDistricts();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.tehsilId.set(Number(id));
      this.loadTehsilDetails(Number(id));
    }
  }

  private loadDistricts() {
    this.districtService.getDistricts()
      .pipe(finalize(() => this.isLoadingDistricts.set(false)))
      .subscribe({
        next: (data) => this.districts = data,
        error: () => this.showNotification('Failed to load districts.', 'error')
      });
  }

  private loadTehsilDetails(id: number) {
    this.markazService.getMarkazById(id).subscribe({
      next: (markaz) => {
        this.tehsilForm.patchValue(markaz);
      },
      error: () => this.showNotification('Failed to load tehsil details.', 'error')
    });
  }

  save() {
    if (this.tehsilForm.invalid) return;

    this.isSaving.set(true);
    const data = this.tehsilForm.value;
    const request = this.isEditMode()
      ? this.markazService.updateMarkaz(this.tehsilId()!, data)
      : this.markazService.createMarkaz(data);

    request.pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.showNotification(`Tehsil successfully ${this.isEditMode() ? 'updated' : 'registered'}!`, 'success');
          this.goBack();
        },
        error: () => this.showNotification('Failed to save tehsil. Please try again.', 'error')
      });
  }

  goBack() {
    this.router.navigate(['/portal/locations/tehsil']);
  }

  private showNotification(message: string, type: 'success' | 'error') {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: type === 'success' ? ['success-snackbar'] : ['error-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }
}
