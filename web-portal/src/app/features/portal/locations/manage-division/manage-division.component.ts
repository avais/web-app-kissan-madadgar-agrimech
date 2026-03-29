import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DivisionService, Division } from '../../../../core/services/division.service';
import { RegionService, Region } from '../../../../core/services/region.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-division-dialog',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatDialogModule, ReactiveFormsModule, MatSlideToggleModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>{{data.edit ? 'Edit' : 'Add'}} Division</h2>
    <mat-dialog-content>
      <form [formGroup]="divisionForm" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Select Region</mat-label>
          <mat-select formControlName="regionId">
            <mat-option *ngIf="isLoading()" disabled>
              <div style="display: flex; align-items: center; gap: 10px;">
                <span>Fetching Regions...</span>
              </div>
            </mat-option>
            <mat-option *ngFor="let region of regions" [value]="region.id">
              {{region.name}}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Division Name (English)</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Multan Division">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Division Name (Urdu)</mat-label>
          <input matInput formControlName="nameUrdu" placeholder="مثلاً ملتان ڈویژن" class="urdu-input">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Division Code</mat-label>
          <input matInput formControlName="code" placeholder="e.g. MLT-01">
        </mat-form-field>

        <div class="status-toggle">
          <span>Active Status</span>
          <mat-slide-toggle formControlName="active" color="primary"></mat-slide-toggle>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="divisionForm.invalid" (click)="save()">Save Division</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: 20px; padding: 20px 0 10px; overflow: hidden; box-sizing: border-box; }
    .dialog-form mat-form-field { width: 100%; }
    ::ng-deep .mat-mdc-form-field-infix { text-align: center; }
    .urdu-input { text-align: center !important; font-family: 'Noto Sans Arabic', sans-serif; font-size: 18px; font-weight: 500; }
    .status-toggle { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #f8fafc; border-radius: 12px; margin-top: 8px; span { font-weight: 600; color: #475569; font-size: 14px; } }
    mat-dialog-content { overflow: hidden !important; }
  `]
})
export class DivisionDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private regionService = inject(RegionService);
  public dialogRef = inject(MatDialogRef<DivisionDialogComponent>);
  public data = inject(MAT_DIALOG_DATA);

  divisionForm: FormGroup;
  regions: Region[] = [];
  isLoading = signal(true);

  constructor() {
    this.divisionForm = this.fb.group({
      regionId: [this.data.division?.regionId || '', Validators.required],
      name: [this.data.division?.name || '', Validators.required],
      nameUrdu: [this.data.division?.nameUrdu || '', Validators.required],
      code: [this.data.division?.code || '', Validators.required],
      active: [this.data.division?.active ?? true]
    });
  }

  ngOnInit() {
    this.regionService.getRegions()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => this.regions = data,
        error: () => this.isLoading.set(false)
      });
  }

  save() { this.dialogRef.close(this.divisionForm.value); }
}

@Component({
  selector: 'app-manage-division',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDialogModule, MatProgressSpinnerModule, MatSnackBarModule],
  template: `
    <div class="location-page">
      <div class="loader-overlay" *ngIf="isLoading()">
        <div class="loader-container">
          <mat-spinner diameter="50" strokeWidth="5"></mat-spinner>
          <div class="loader-text">
            <h3>Fetching Divisions</h3>
            <p>Syncing geographic data with server...</p>
          </div>
        </div>
      </div>

      <div class="header">
        <div class="title-section">
          <h1>Manage Divisions</h1>
          <p>Configure divisions within each regional zone.</p>
        </div>
        <button mat-flat-button color="primary" class="add-btn" (click)="openDialog()">
          <mat-icon>add</mat-icon> Add New Division
        </button>
      </div>

      <div class="filters">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search Divisions</mat-label>
          <input matInput placeholder="Search by name or code..." (keyup)="applyFilter($event)">
          <mat-icon matPrefix>search</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="select-field">
          <mat-label>Filter by Region</mat-label>
          <mat-select (selectionChange)="onRegionFilter($event.value)">
            <mat-option value="all">All Regions</mat-option>
            <mat-option *ngFor="let region of regions" [value]="region.id">
              {{region.name}}
            </mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <mat-card class="table-card">
        <table mat-table [dataSource]="dataSource">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef class="text-center"> Division Name </th>
            <td mat-cell *matCellDef="let element" class="text-center"> 
                <div class="name-cell">
                    <mat-icon class="icon">map</mat-icon>
                    <span>{{element.name}}</span>
                </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="nameUrdu">
            <th mat-header-cell *matHeaderCellDef class="text-center"> Division (Urdu) </th>
            <td mat-cell *matCellDef="let element" class="text-center urdu-text"> {{element.nameUrdu}} </td>
          </ng-container>

          <ng-container matColumnDef="code">
            <th mat-header-cell *matHeaderCellDef class="text-center"> Code </th>
            <td mat-cell *matCellDef="let element" class="text-center"> 
                <span class="region-badge" style="background: #f1f5f9; color: #475569;">{{element.code}}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="region">
            <th mat-header-cell *matHeaderCellDef class="text-center"> Parent Region </th>
            <td mat-cell *matCellDef="let element" class="text-center"> 
                <span class="region-badge">{{element.regionName}}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="districts">
            <th mat-header-cell *matHeaderCellDef class="text-center"> Districts </th>
            <td mat-cell *matCellDef="let element" class="text-center"> 
                <span class="badge-rounded district-badge">{{element.districtsCount || 0}}</span>
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
              <button mat-icon-button color="warn" (click)="deleteDivision(element)" title="Delete"><mat-icon>delete</mat-icon></button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <div class="empty-state" *ngIf="dataSource.filteredData.length === 0 && !isLoading()">
          <mat-icon>travel_explore</mat-icon>
          <h3>No Divisions Found</h3>
          <p>No geographic records match your current criteria.</p>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .location-page { position: relative; display: flex; flex-direction: column; gap: 24px; min-height: 400px; }
    .header {
      display: flex; justify-content: space-between; align-items: flex-end;
      h1 { font-size: 28px; font-weight: 800; color: #1e293b; margin: 0; }
      p { font-size: 15px; color: #64748b; margin: 4px 0 0; }
      .add-btn { height: 48px; border-radius: 12px; font-weight: 700; background-color: #4CAF50 !important; }
    }
    .filters { display: flex; gap: 16px; .search-field { width: 400px; } .select-field { width: 250px; } }
    .table-card { border: none; border-radius: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); overflow: hidden; table { width: 100%; } }
    .text-center { text-align: center !important; }
    .name-cell { display: flex; align-items: center; justify-content: center; gap: 10px; span { font-weight: 600; color: #1e293b; } .icon { color: #4CAF50; } }
    .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; background: #fee2e2; color: #991b1b; &.active { background: #dcfce7; color: #166534; } }
    .region-badge { background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; }
    .badge-rounded { padding: 4px 14px; border-radius: 12px; font-size: 13px; font-weight: 800; display: inline-block; min-width: 40px; }
    .district-badge { background: #f5f3ff; color: #6d28d9; border: 1px solid #ddd6fe; }
    .urdu-text { font-family: 'Noto Sans Arabic', sans-serif; font-size: 17px; font-weight: 600; color: #1e293b; }
    th { color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    td { height: 75px; border-bottom: 1px solid #f1f5f9; }
    .loader-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; border-radius: 20px; animation: fadeIn 0.3s ease-out; .loader-container { display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; .loader-text { h3 { font-size: 18px; font-weight: 800; color: #1e293b; margin: 0; } p { color: #64748b; font-size: 14px; margin: 4px 0 0; } } } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .empty-state { padding: 48px; text-align: center; color: #64748b; mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5; } h3 { font-size: 20px; font-weight: 700; color: #1e293b; margin: 0; } p { margin: 8px 0 0; } }
    ::ng-deep { .mat-mdc-progress-spinner circle { stroke: #4CAF50 !important; } }
  `]
})
export class ManageDivisionComponent implements OnInit {
  private divisionService = inject(DivisionService);
  private regionService = inject(RegionService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  displayedColumns = ['name', 'nameUrdu', 'code', 'region', 'districts', 'status', 'actions'];
  dataSource = new MatTableDataSource<Division>([]);
  regions: Region[] = [];
  isLoading = signal(false);

  ngOnInit() {
    this.loadDivisions();
    this.regionService.getRegions().subscribe(data => this.regions = data);
  }

  loadDivisions() {
    this.isLoading.set(true);
    this.divisionService.getDivisions()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => this.dataSource.data = data,
        error: () => this.showNotification('Failed to load divisions.', 'error')
      });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  onRegionFilter(regionId: any) {
    if (regionId === 'all') {
      this.dataSource.filter = '';
    } else {
      // Custom filter logic or just filter by region name in the table
      const region = this.regions.find(r => r.id === regionId);
      if (region) this.dataSource.filter = region.name.toLowerCase();
    }
  }

  openDialog(division?: Division) {
    const dialogRef = this.dialog.open(DivisionDialogComponent, {
      width: '450px',
      data: { division, edit: !!division }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading.set(true);
        const action = (division && division.id) ? 'updated' : 'created';
        const request = (division && division.id)
          ? this.divisionService.updateDivision(division.id, result)
          : this.divisionService.createDivision(result);

        request.pipe(finalize(() => this.isLoading.set(false)))
          .subscribe({
            next: () => {
              this.showNotification(`Division successfully ${action}!`, 'success');
              this.loadDivisions();
            },
            error: () => this.showNotification(`Failed to save division.`, 'error')
          });
      }
    });
  }

  deleteDivision(division: Division) {
    if (division.id && confirm(`Are you sure you want to delete ${division.name}?`)) {
      this.isLoading.set(true);
      this.divisionService.deleteDivision(division.id)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: () => {
            this.showNotification('Division deleted successfully.', 'success');
            this.loadDivisions();
          },
          error: () => this.showNotification('Failed to delete division.', 'error')
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
