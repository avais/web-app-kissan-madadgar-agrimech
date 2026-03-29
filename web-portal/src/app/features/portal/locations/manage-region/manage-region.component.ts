import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RegionService, Region } from '../../../../core/services/region.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-region-dialog',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatDialogModule, ReactiveFormsModule, MatSlideToggleModule],
  template: `
    <h2 mat-dialog-title>{{data.edit ? 'Edit' : 'Add'}} Region</h2>
    <mat-dialog-content>
      <form [formGroup]="regionForm" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Region Name (English)</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Northern Punjab">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Region Name (Urdu)</mat-label>
          <input matInput formControlName="nameUrdu" placeholder="مثلاً شمالی پنجاب" class="urdu-input">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Region Code</mat-label>
          <input matInput formControlName="code" placeholder="e.g. NP-01">
        </mat-form-field>

        <div class="status-toggle">
          <span>Active Status</span>
          <mat-slide-toggle formControlName="active" color="primary"></mat-slide-toggle>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="regionForm.invalid" (click)="save()">Save Region</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { 
      display: flex; 
      flex-direction: column; 
      gap: 20px; 
      padding: 20px 0 10px; 
      overflow: hidden;
      box-sizing: border-box;
    }
    .dialog-form mat-form-field { width: 100%; }
    ::ng-deep .mat-mdc-form-field-infix { text-align: center; }
    
    .urdu-input { 
      text-align: center !important; 
      font-family: 'Noto Sans Arabic', sans-serif; 
      font-size: 18px; 
      font-weight: 500;
    }

    .status-toggle { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      padding: 10px 12px;
      background: #f8fafc;
      border-radius: 12px;
      margin-top: 8px;
      span { font-weight: 600; color: #475569; font-size: 14px; }
    }
    mat-dialog-content { overflow: hidden !important; }
  `]
})
export class RegionDialogComponent {
  private fb = inject(FormBuilder);
  public dialogRef = inject(MatDialogRef<RegionDialogComponent>);
  public data = inject(MAT_DIALOG_DATA);
  regionForm: FormGroup;

  constructor() {
    this.regionForm = this.fb.group({
      name: [this.data.region?.name || '', Validators.required],
      nameUrdu: [this.data.region?.nameUrdu || '', Validators.required],
      code: [this.data.region?.code || '', Validators.required],
      active: [this.data.region?.active ?? true]
    });
  }
  save() { this.dialogRef.close(this.regionForm.value); }
}

@Component({
  selector: 'app-manage-region',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatCardModule, MatFormFieldModule, MatInputModule, MatDialogModule, MatProgressSpinnerModule, MatSnackBarModule],
  template: `
    <div class="location-page">
      <!-- High-end Loader -->
      <div class="loader-overlay" *ngIf="isLoading()">
        <div class="loader-container">
          <mat-spinner diameter="50" strokeWidth="5"></mat-spinner>
          <div class="loader-text">
            <h3>Fetching Regions</h3>
            <p>Syncing geographic data with server...</p>
          </div>
        </div>
      </div>

      <div class="header">
        <div class="title-section">
          <h1>Manage Regions</h1>
          <p>Define and translate geographic regions in English and Urdu.</p>
        </div>
        <button mat-flat-button color="primary" class="add-btn" (click)="openDialog()">
          <mat-icon>add</mat-icon> Add New Region
        </button>
      </div>

      <div class="filters">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search Regions</mat-label>
          <input matInput placeholder="Search by name or code..." (keyup)="applyFilter($event)">
          <mat-icon matPrefix>search</mat-icon>
        </mat-form-field>
      </div>

      <mat-card class="table-card">
        <table mat-table [dataSource]="dataSource">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef class="text-center"> Region Name (English) </th>
            <td mat-cell *matCellDef="let element" class="text-center"> 
              <div class="name-cell">
                <mat-icon class="region-icon">public</mat-icon>
                <span>{{element.name}}</span>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="nameUrdu">
            <th mat-header-cell *matHeaderCellDef class="text-center"> Region Name (Urdu) </th>
            <td mat-cell *matCellDef="let element" class="text-center urdu-text"> {{element.nameUrdu}} </td>
          </ng-container>

          <ng-container matColumnDef="code">
            <th mat-header-cell *matHeaderCellDef class="text-center"> Region Code </th>
            <td mat-cell *matCellDef="let element" class="text-center"> 
                <span class="code-badge">{{element.code}}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="divisions">
            <th mat-header-cell *matHeaderCellDef class="text-center"> Divisions </th>
            <td mat-cell *matCellDef="let element" class="text-center"> 
              <span class="badge-rounded division-badge">{{element.divisionsCount || 0}}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="districts">
            <th mat-header-cell *matHeaderCellDef class="text-center"> Districts </th>
            <td mat-cell *matCellDef="let element" class="text-center"> 
              <span class="badge-rounded district-badge">{{element.districtsCount || 0}}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="tehsil">
            <th mat-header-cell *matHeaderCellDef class="text-center"> Tehsils </th>
            <td mat-cell *matCellDef="let element" class="text-center"> 
              <span class="badge-rounded tehsil-badge">{{element.markazCount || 0}}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef class="text-center"> Status </th>
            <td mat-cell *matCellDef="let element" class="text-center"> 
              <span class="status-badge" [class.active]="element.active">
                {{element.active ? 'Active' : 'Inactive'}}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="text-center"> Actions </th>
            <td mat-cell *matCellDef="let element" class="text-center">
              <button mat-icon-button color="primary" (click)="openDialog(element)" title="Edit"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button color="warn" (click)="deleteRegion(element)" title="Delete"><mat-icon>delete</mat-icon></button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="dataSource.data.length === 0 && !isLoading()">
          <mat-icon>map</mat-icon>
          <h3>No Regions Found</h3>
          <p>Click 'Add New Region' to get started</p>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .location-page { position: relative; display: flex; flex-direction: column; gap: 24px; min-height: 400px; }
    
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
      animation: fadeIn 0.3s ease-out;

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

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .header {
      display: flex; justify-content: space-between; align-items: flex-end;
      h1 { font-size: 28px; font-weight: 800; color: #1e293b; margin: 0; }
      p { font-size: 15px; color: #64748b; margin: 4px 0 0; }
      .add-btn { height: 48px; border-radius: 12px; font-weight: 700; background-color: #4CAF50 !important; }
    }
    .filters { .search-field { width: 400px; } }
    .table-card { border: none; border-radius: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); overflow: hidden; table { width: 100%; } }
    
    .text-center { text-align: center !important; }

    .name-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      .region-icon {
        color: #4CAF50;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      span { font-weight: 600; color: #1e293b; }
    }
    
    .code-badge { background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; }
    
    .badge-rounded {
      padding: 4px 14px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 800;
      display: inline-block;
      min-width: 40px;
    }

    .division-badge { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
    .district-badge { background: #f5f3ff; color: #6d28d9; border: 1px solid #ddd6fe; }
    .tehsil-badge { background: #fff7ed; color: #c2410c; border: 1px solid #ffedd5; }

    .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; background: #fee2e2; color: #991b1b; &.active { background: #dcfce7; color: #166534; } }
    
    .urdu-text { 
      font-family: 'Noto Sans Arabic', sans-serif; 
      font-size: 17px; 
      font-weight: 600;
      color: #1e293b;
    }

    th { color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    td { height: 75px; border-bottom: 1px solid #f1f5f9; }

    .empty-state {
      padding: 48px;
      text-align: center;
      color: #64748b;
      mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5; }
      h3 { font-size: 20px; font-weight: 700; color: #1e293b; margin: 0; }
      p { margin: 8px 0 0; }
    }

    ::ng-deep {
      .mat-mdc-progress-spinner circle { stroke: #4CAF50 !important; }
      .mat-sort-header-container { justify-content: center; }
    }
  `]
})
export class ManageRegionComponent implements OnInit {
  private regionService = inject(RegionService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  displayedColumns = ['name', 'nameUrdu', 'code', 'divisions', 'districts', 'tehsil', 'status', 'actions'];
  dataSource = new MatTableDataSource<Region>([]);
  isLoading = signal(false);

  ngOnInit() {
    this.loadRegions();
  }

  loadRegions() {
    this.isLoading.set(true);
    this.regionService.getRegions()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => {
          this.dataSource.data = data;
        },
        error: (err) => {
          this.showNotification('Failed to load regions. Please check your connection.', 'error');
          console.error('Error loading regions', err);
        }
      });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  openDialog(region?: Region) {
    const dialogRef = this.dialog.open(RegionDialogComponent, {
      width: '450px',
      data: { region, edit: !!region }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading.set(true);
        const action = (region && region.id) ? 'updated' : 'created';
        const request = (region && region.id)
          ? this.regionService.updateRegion(region.id, result)
          : this.regionService.createRegion(result);

        request.pipe(finalize(() => this.isLoading.set(false)))
          .subscribe({
            next: () => {
              this.showNotification(`Region successfully ${action}!`, 'success');
              this.loadRegions();
            },
            error: () => this.showNotification(`Failed to save region.`, 'error')
          });
      }
    });
  }

  deleteRegion(region: Region) {
    if (region.id && confirm(`Are you sure you want to delete ${region.name}?`)) {
      this.isLoading.set(true);
      this.regionService.deleteRegion(region.id)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: () => {
            this.showNotification('Region deleted successfully.', 'success');
            this.loadRegions();
          },
          error: () => this.showNotification('Failed to delete region.', 'error')
        });
    }
  }

  private showNotification(message: string, type: 'success' | 'error') {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: type === 'success' ? ['success-snackbar'] : ['error-snackbar']
    });
  }
}
