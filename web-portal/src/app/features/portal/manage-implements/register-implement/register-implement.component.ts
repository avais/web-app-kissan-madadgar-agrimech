import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ImplementService } from '../../../../core/services/implement.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-register-implement',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="register-container">
      <!-- High-end Loader -->
      <div class="loader-overlay" *ngIf="isLoading()">
        <div class="loader-container">
          <mat-spinner diameter="50" strokeWidth="5"></mat-spinner>
          <div class="loader-text">
            <h3>{{isEdit ? 'Updating' : 'Creating'}} Implement</h3>
            <p>Processing subsidy calculations and saving records...</p>
          </div>
        </div>
      </div>
      <div class="header">
        <button mat-icon-button routerLink="/portal/implements" title="Back">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1 class="title">{{isEdit ? 'Update' : 'Create New'}} Implement</h1>
      </div>

      <mat-card class="form-card">
        <form [formGroup]="implementForm" (ngSubmit)="onSubmit()">
          <div class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Name of Implement</mat-label>
              <input matInput formControlName="name" placeholder="e.g. Tractor Mounted Spray" required>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Subsidy Year</mat-label>
              <input matInput formControlName="subsidyYear" placeholder="e.g. 2024-25" required>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Total Cost Price</mat-label>
              <input matInput type="number" formControlName="totalCostPrice" (input)="updateCalculations()" required>
              <span matPrefix class="currency-prefix">Rs. &nbsp;</span>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Subsidy Percentage (%)</mat-label>
              <input matInput type="number" formControlName="subsidyPercentage" (input)="updateCalculations()" required>
              <span matSuffix>%</span>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Government Share</mat-label>
              <input matInput type="number" formControlName="governmentShare" readonly>
              <span matPrefix class="currency-prefix">Rs. &nbsp;</span>
              <mat-hint>Automatically calculated</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Farmer Share</mat-label>
              <input matInput type="number" formControlName="farmerShare" readonly>
              <span matPrefix class="currency-prefix">Rs. &nbsp;</span>
              <mat-hint>Automatically calculated</mat-hint>
            </mat-form-field>
          </div>

          <div class="actions">
            <button mat-button type="button" routerLink="/portal/implements">Cancel</button>
            <button mat-raised-button color="primary" type="submit" [disabled]="implementForm.invalid">
              <mat-icon>{{isEdit ? 'save' : 'add'}}</mat-icon>
              {{isEdit ? 'Save Changes' : 'Create Implement'}}
            </button>
          </div>
        </form>
      </mat-card>
    </div>
  `,
  styles: [`
    .register-container {
      position: relative;
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
      min-height: 400px;
    }
    .loader-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(4px);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 20px;
      .loader-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        text-align: center;
        .loader-text {
          h3 { font-size: 18px; font-weight: 800; color: #1e293b; margin: 0; }
          p { color: #64748b; font-size: 14px; margin: 4px 0 0; }
        }
      }
    }
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }
    .title {
      margin: 0;
      font-size: 24px;
      font-weight: 500;
    }
    .form-card {
      padding: 32px;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #eee;
    }
    mat-form-field {
      width: 100%;
    }
    .currency-prefix {
      font-size: 1.1rem;
      font-weight: 500;
      color: #444;
      display: inline-block;
      margin-top: -2px;
    }
  `]
})
export class RegisterImplementComponent implements OnInit {
  private fb = inject(FormBuilder);
  private implementService = inject(ImplementService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  implementForm: FormGroup;
  isEdit = false;
  implementId?: number;
  isLoading = signal(false);

  constructor() {
    this.implementForm = this.fb.group({
      name: ['', Validators.required],
      totalCostPrice: [null, [Validators.required, Validators.min(0)]],
      subsidyYear: ['', Validators.required],
      subsidyPercentage: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
      governmentShare: [{ value: 0, disabled: true }],
      farmerShare: [{ value: 0, disabled: true }]
    });
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.isEdit = true;
        this.implementId = +id;
        this.loadImplement(this.implementId);
      } else {
        this.isEdit = false;
        this.implementId = undefined;
        this.implementForm.reset();
      }
    });
  }

  loadImplement(id: number) {
    this.isLoading.set(true);
    this.implementService.getById(id)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe(data => {
        this.implementForm.patchValue(data);
        this.updateCalculations();
      });
  }

  updateCalculations() {
    const cost = this.implementForm.get('totalCostPrice')?.value || 0;
    const percentage = this.implementForm.get('subsidyPercentage')?.value || 0;

    const govShare = (cost * percentage) / 100;
    const farmerShare = cost - govShare;

    this.implementForm.patchValue({
      governmentShare: govShare,
      farmerShare: farmerShare
    }, { emitEvent: false });
  }

  onSubmit() {
    if (this.implementForm.valid) {
      this.isLoading.set(true);
      const data = this.implementForm.getRawValue();

      if (this.isEdit && this.implementId) {
        this.implementService.update(this.implementId, data)
          .pipe(finalize(() => this.isLoading.set(false)))
          .subscribe(() => {
            this.router.navigate(['/portal/implements']);
          });
      } else {
        this.implementService.create(data)
          .pipe(finalize(() => this.isLoading.set(false)))
          .subscribe(() => {
            this.router.navigate(['/portal/implements']);
          });
      }
    }
  }
}
