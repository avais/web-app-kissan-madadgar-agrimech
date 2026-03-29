import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { ProjectService } from '../../../../core/services/project.service';
import { ImplementService } from '../../../../core/services/implement.service';
import { Project } from '../../../../core/models/project.model';
import { Implement } from '../../../../core/models/implement.model';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { finalize, map, startWith, combineLatest, BehaviorSubject } from 'rxjs';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-register-project',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatSelectModule,
    MatAutocompleteModule
  ],
  template: `
    <div class="register-container">
      <div class="loader-overlay" *ngIf="isSaving() || isLoading()">
        <div class="loader-container">
          <mat-spinner diameter="50" strokeWidth="5"></mat-spinner>
          <div class="loader-text">
            <h3>{{ isSaving() ? 'Committing Changes' : 'Drafting Project' }}</h3>
            <p>{{ isSaving() ? 'Securing project parameters in the system...' : 'Synchronizing registry data...' }}</p>
          </div>
        </div>
      </div>

      <div class="header-section">
        <div class="title-info">
          <button mat-icon-button (click)="goBack()" class="back-btn">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div>
            <h1>{{ isEditMode() ? 'Edit' : 'Register' }} Project Portfolio</h1>
            <p>Configure project parameters, financial benchmarks, and target machinery.</p>
          </div>
        </div>
        <div class="actions">
          <button mat-stroked-button (click)="goBack()">Cancel</button>
          <button mat-flat-button color="primary" class="save-btn" (click)="save()" [disabled]="projectForm.invalid || isSaving()">
            <mat-spinner diameter="20" *ngIf="isSaving()"></mat-spinner>
            <span *ngIf="!isSaving()">{{ isEditMode() ? 'Update' : 'Register' }} Project</span>
            <mat-icon *ngIf="!isSaving()">check_circle</mat-icon>
          </button>
        </div>
      </div>

      <div class="form-wrapper">
        <mat-card class="form-card">
          <div class="card-header">
            <mat-icon>info</mat-icon>
            <h2>Basic Information</h2>
          </div>
          
          <form [formGroup]="projectForm" class="project-form">
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Project Name*</mat-label>
                <input matInput formControlName="name" placeholder="Enter project designation">
              </mat-form-field>

              <mat-form-field appearance="outline" class="searchable-field">
                <mat-label>Select Implements*</mat-label>
                <mat-select formControlName="implementIds" multiple placeholder="Select implements...">
                  <mat-select-trigger>
                    {{getImplementName(projectForm.get('implementIds')?.value?.[0])}}
                    <span *ngIf="(projectForm.get('implementIds')?.value?.length || 0) > 1" class="more-count">
                      (+{{(projectForm.get('implementIds')?.value?.length || 0) - 1}} others)
                    </span>
                  </mat-select-trigger>
                  <mat-option *ngFor="let imp of implements()" [value]="imp.id">
                    {{imp.name}}
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Project Description</mat-label>
              <textarea matInput formControlName="description" rows="3" placeholder="Brief project overview"></textarea>
            </mat-form-field>

            <div class="section-divider">
               <mat-icon>insights</mat-icon>
               <span>Financials & Capacity</span>
            </div>

            <div class="form-row grid-3">
              <mat-form-field appearance="outline">
                <mat-label>Total Beneficiaries*</mat-label>
                <input matInput type="number" formControlName="totalBeneficiary">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Total Project Cost*</mat-label>
                <input matInput type="number" formControlName="totalProjectCost">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Unit Cost*</mat-label>
                <input matInput type="number" formControlName="unitCost">
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Subsidy Per Unit*</mat-label>
                <input matInput type="number" formControlName="subsidyCost">
              </mat-form-field>

              <div class="settings-panel">
                <div class="setting-item">
                  <div class="info">
                    <span class="label">Operational Status</span>
                    <span class="desc">Active projects will be visible to stakeholders.</span>
                  </div>
                  <mat-slide-toggle formControlName="active" color="primary"></mat-slide-toggle>
                </div>
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
      max-width: 1000px;
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

    .form-wrapper { width: 100%; }

    .form-card {
      border-radius: 24px;
      border: none;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.04);
      padding: 32px;

      .card-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 24px;
        mat-icon { color: #3b82f6; }
        h2 { margin: 0; font-size: 18px; font-weight: 700; color: #1e293b; }
      }
    }

    .project-form {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        &.grid-3 { grid-template-columns: 1fr 1fr 1fr; }
      }

      mat-form-field { width: 100%; }
    }

    .section-divider {
      margin-top: 16px;
      margin-bottom: 24px;
      padding-top: 24px;
      border-top: 1px dashed #e2e8f0;
      display: flex;
      align-items: center;
      gap: 10px;
      mat-icon { color: #4CAF50; font-size: 20px; width: 20px; height: 20px; }
      span { font-size: 14px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 1px; }
    }

    .settings-panel {
      background: #f8fafc;
      border-radius: 16px;
      padding: 20px;
      border: 1px solid #f1f5f9;
      height: fit-content;

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

    .more-count { font-size: 12px; color: #64748b; font-weight: 600; margin-left: 4px; }

    .more-count { font-size: 12px; color: #64748b; font-weight: 600; margin-left: 4px; }

    .option-row {
      display: flex; align-items: center; justify-content: flex-start;
      span { font-weight: 500; font-size: 15px; color: #1e293b; }
    }

    .dropdown-arrow { 
      color: #4CAF50 !important; 
      transition: transform 0.3s ease;
      cursor: pointer;
    }

    .searchable-field.mat-focused .dropdown-arrow { 
      transform: rotate(180deg);
    }

    .loader-overlay {
      position: fixed; inset: 0; background: rgba(255,255,255,0.85); backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
      .loader-container { display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; }
      h3 { font-size: 20px; font-weight: 800; color: #1e293b; margin: 0; }
      p { color: #64748b; font-size: 14px; }
    }

    ::ng-deep {
      .mat-mdc-progress-spinner circle { stroke: #4CAF50 !important; }
      .mat-mdc-form-field-subscript-wrapper { display: none; }
      
      .mdc-notched-outline__leading, .mdc-notched-outline__notch, .mdc-notched-outline__trailing {
        border-color: #cbd5e1 !important;
      }
      .mat-focused .mdc-notched-outline__leading, .mat-focused .mdc-notched-outline__notch, .mat-focused .mdc-notched-outline__trailing {
        border-color: #4CAF50 !important;
      }
      .mat-focused .mat-mdc-form-field-label { color: #4CAF50 !important; }
      
      .mat-mdc-autocomplete-panel {
        background: #fff !important;
        border-radius: 16px !important;
        box-shadow: 0 10px 40px rgba(0,0,0,0.1) !important;
        margin-top: 8px !important;
      }
    }
  `]
})
export class RegisterProjectComponent implements OnInit {
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private implementService = inject(ImplementService);

  implements = signal<Implement[]>([]);

  projectForm: FormGroup;
  isEditMode = signal(false);
  projectId = signal<number | null>(null);
  isLoading = signal(false);
  isSaving = signal(false);


  constructor() {
    this.projectForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      totalBeneficiary: [0, [Validators.required, Validators.min(0)]],
      totalProjectCost: [0, [Validators.required, Validators.min(0)]],
      unitCost: [0, [Validators.required, Validators.min(0)]],
      subsidyCost: [0, [Validators.required, Validators.min(0)]],
      active: [true],
      implementIds: [[]]
    });
  }

  ngOnInit() {
    this.loadImplements();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.projectId.set(Number(id));
    }
  }

  loadImplements() {
    this.implementService.getAll().subscribe({
      next: (data) => {
        this.implements.set(data);
        if (this.projectId()) {
          this.loadProjectDetails(this.projectId()!);
        }
      },
      error: (err) => console.error('Failed to load implements', err)
    });
  }

  getImplementName(id: number): string {
    const imp = this.implements().find(i => i.id === id);
    return imp ? imp.name : '';
  }

  loadProjectDetails(id: number) {
    this.isLoading.set(true);
    this.projectService.getProjectById(id)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (project: Project) => {
          this.projectForm.patchValue(project);
          if (project.implementIds) {
            this.projectForm.get('implementIds')?.setValue(project.implementIds);
          } else if (project.implementId) {
            this.projectForm.get('implementIds')?.setValue([project.implementId]);
          }
        },
        error: () => this.showNotification('Failed to load project details', 'error')
      });
  }

  save() {
    if (this.projectForm.invalid) return;
    this.isSaving.set(true);
    const data: Project = this.projectForm.value;
    // Set implementId to the first one for backward compatibility if needed by backend
    if (data.implementIds && data.implementIds.length > 0) {
      data.implementId = data.implementIds[0];
    }

    const request = this.isEditMode()
      ? this.projectService.updateProject(this.projectId()!, data)
      : this.projectService.createProject(data);

    request.pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.showNotification(`Project successfully ${this.isEditMode() ? 'updated' : 'created'}!`, 'success');
          this.goBack();
        },
        error: () => this.showNotification('Failed to save project.', 'error')
      });
  }

  goBack() { this.router.navigate(['/portal/projects']); }

  private showNotification(message: string, type: 'success' | 'error') {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: type === 'success' ? ['success-snackbar'] : ['error-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }
}
