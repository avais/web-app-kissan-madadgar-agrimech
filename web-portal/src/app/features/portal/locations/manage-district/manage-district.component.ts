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
import { DistrictService, District } from '../../../../core/services/district.service';
import { DivisionService, Division } from '../../../../core/services/division.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-district-dialog',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatDialogModule, ReactiveFormsModule, MatSlideToggleModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>{{data.edit ? 'Edit' : 'Add'}} District</h2>
    <mat-dialog-content>
      <form [formGroup]="districtForm" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Select Division</mat-label>
          <mat-select formControlName="divisionId">
            <mat-option *ngIf="isLoading()" disabled>
              <div style="display: flex; align-items: center; gap: 10px;">
                <span>Fetching Divisions...</span>
              </div>
            </mat-option>
            <mat-option *ngFor="let div of divisions" [value]="div.id">
              {{div.name}}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>District Name (English)</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Multan">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>District Name (Urdu)</mat-label>
          <input matInput formControlName="nameUrdu" placeholder="مثلاً ملتان" class="urdu-input">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>District Code</mat-label>
          <input matInput formControlName="code" placeholder="e.g. MTN-01">
        </mat-form-field>

        <div style="display: flex; gap: 10px;">
          <mat-form-field appearance="outline" style="flex: 1;">
            <mat-label>Latitude</mat-label>
            <input matInput type="number" formControlName="latitude">
          </mat-form-field>
          <mat-form-field appearance="outline" style="flex: 1;">
            <mat-label>Longitude</mat-label>
            <input matInput type="number" formControlName="longitude">
          </mat-form-field>
        </div>

        <div class="status-toggle">
          <span>Active Status</span>
          <mat-slide-toggle formControlName="active" color="primary"></mat-slide-toggle>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="districtForm.invalid" (click)="save()">Save District</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: 20px; padding: 20px 0 10px; overflow: hidden; box-sizing: border-box; }
    .dialog-form mat-form-field { width: 100%; }
    ::ng-deep .mat-mdc-form-field-infix { text-align: center; }
    .urdu-input { text-align: center !important; font-family: 'Noto Sans Arabic', sans-serif; font-size: 18px; font-weight: 500; }
    .status-toggle { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #f8fafc; border-radius: 12px; margin-top: 8px; span { font-weight: 600; color: #475569; font-size: 14px; } }
  `]
})
export class DistrictDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private divisionService = inject(DivisionService);
  public dialogRef = inject(MatDialogRef<DistrictDialogComponent>);
  public data = inject(MAT_DIALOG_DATA);

  districtForm: FormGroup;
  divisions: Division[] = [];
  isLoading = signal(true);

  constructor() {
    this.districtForm = this.fb.group({
      divisionId: [this.data.district?.divisionId || '', Validators.required],
      name: [this.data.district?.name || '', Validators.required],
      nameUrdu: [this.data.district?.nameUrdu || '', Validators.required],
      code: [this.data.district?.code || '', Validators.required],
      latitude: [this.data.district?.latitude || ''],
      longitude: [this.data.district?.longitude || ''],
      active: [this.data.district?.active ?? true]
    });
  }

  ngOnInit() {
    this.divisionService.getDivisions()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => this.divisions = data,
        error: () => this.isLoading.set(false)
      });
  }

  save() { this.dialogRef.close(this.districtForm.value); }
}

@Component({
  selector: 'app-manage-district',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDialogModule, MatProgressSpinnerModule, MatSnackBarModule],
  template: `
    <div class="location-page">
      <div class="loader-overlay" *ngIf="isLoading()">
        <div class="loader-container">
          <mat-spinner diameter="50" strokeWidth="5"></mat-spinner>
          <div class="loader-text">
            <h3>Fetching Districts</h3>
            <p>Syncing geographic data with server...</p>
          </div>
        </div>
      </div>

      <div class="header">
        <div class="title-section">
          <h1>Manage Districts</h1>
          <p>Register and oversee administrative districts within divisions.</p>
        </div>
        <button mat-flat-button color="primary" class="add-btn" (click)="openDialog()">
          <mat-icon>add</mat-icon> Add New District
        </button>
      </div>

      <div class="filters">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search Districts</mat-label>
          <input matInput placeholder="Search by name or code..." (keyup)="applyFilter($event)">
          <mat-icon matPrefix>search</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="select-field">
          <mat-label>Filter by Division</mat-label>
          <mat-select (selectionChange)="onDivisionFilter($event.value)">
            <mat-option value="all">All Divisions</mat-option>
            <mat-option *ngFor="let div of divisions" [value]="div.id">
              {{div.name}}
            </mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <mat-card class="table-card">
        <table mat-table [dataSource]="dataSource">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef class="text-center"> District Name </th>
            <td mat-cell *matCellDef="let element" class="text-center"> 
                <div class="name-cell">
                    <mat-icon class="icon">location_searching</mat-icon>
                    <span>{{element.name}}</span>
                </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="nameUrdu">
            <th mat-header-cell *matHeaderCellDef class="text-center"> District (Urdu) </th>
            <td mat-cell *matCellDef="let element" class="text-center urdu-text"> {{element.nameUrdu}} </td>
          </ng-container>

          <ng-container matColumnDef="code">
            <th mat-header-cell *matHeaderCellDef class="text-center"> Code </th>
            <td mat-cell *matCellDef="let element" class="text-center"> 
                <span class="division-badge" style="background: #f1f5f9; color: #475569;">{{element.code}}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="division">
            <th mat-header-cell *matHeaderCellDef class="text-center"> Parent Division </th>
            <td mat-cell *matCellDef="let element" class="text-center"> 
                <span class="division-badge">{{element.divisionName}}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="tehsil">
            <th mat-header-cell *matHeaderCellDef class="text-center"> Total Tehsils </th>
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
              <button mat-icon-button color="warn" (click)="deleteDistrict(element)" title="Delete"><mat-icon>delete</mat-icon></button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <div class="empty-state" *ngIf="dataSource.filteredData.length === 0 && !isLoading()">
          <mat-icon>explore_off</mat-icon>
          <h3>No Districts Found</h3>
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
    .division-badge { background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; }
    .badge-rounded { padding: 4px 14px; border-radius: 12px; font-size: 13px; font-weight: 800; display: inline-block; min-width: 40px; }
    .tehsil-badge { background: #fff7ed; color: #c2410c; border: 1px solid #ffedd5; }
    .urdu-text { font-family: 'Noto Sans Arabic', sans-serif; font-size: 17px; font-weight: 600; color: #1e293b; }
    th { color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    td { height: 75px; border-bottom: 1px solid #f1f5f9; }
    .loader-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; border-radius: 20px; .loader-container { display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; .loader-text { h3 { font-size: 18px; font-weight: 800; color: #1e293b; margin: 0; } p { color: #64748b; font-size: 14px; margin: 4px 0 0; } } } }
    .empty-state { padding: 48px; text-align: center; color: #64748b; mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5; } h3 { font-size: 20px; font-weight: 700; color: #1e293b; margin: 0; } p { margin: 8px 0 0; } }
    ::ng-deep { .mat-mdc-progress-spinner circle { stroke: #4CAF50 !important; } }
  `]
})
export class ManageDistrictComponent implements OnInit {
  private districtService = inject(DistrictService);
  private divisionService = inject(DivisionService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  displayedColumns = ['name', 'nameUrdu', 'code', 'division', 'tehsil', 'status', 'actions'];
  dataSource = new MatTableDataSource<District>([]);
  divisions: Division[] = [];
  isLoading = signal(false);

  ngOnInit() {
    this.loadDistricts();
    this.divisionService.getDivisions().subscribe(data => this.divisions = data);
  }

  loadDistricts() {
    this.isLoading.set(true);
    this.districtService.getDistricts()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => this.dataSource.data = data,
        error: () => this.showNotification('Failed to load districts.', 'error')
      });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  onDivisionFilter(divisionId: any) {
    if (divisionId === 'all') {
      this.dataSource.filter = '';
    } else {
      const division = this.divisions.find(d => d.id === divisionId);
      if (division) this.dataSource.filter = division.name.toLowerCase();
    }
  }

  openDialog(district?: District) {
    const dialogRef = this.dialog.open(DistrictDialogComponent, {
      width: '450px',
      data: { district, edit: !!district }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading.set(true);
        const action = (district && district.id) ? 'updated' : 'created';
        const request = (district && district.id)
          ? this.districtService.updateDistrict(district.id, result)
          : this.districtService.createDistrict(result);

        request.pipe(finalize(() => this.isLoading.set(false)))
          .subscribe({
            next: () => {
              this.showNotification(`District successfully ${action}!`, 'success');
              this.loadDistricts();
            },
            error: () => this.showNotification(`Failed to save district.`, 'error')
          });
      }
    });
  }

  deleteDistrict(district: District) {
    if (district.id && confirm(`Are you sure you want to delete ${district.name}?`)) {
      this.isLoading.set(true);
      this.districtService.deleteDistrict(district.id)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: () => {
            this.showNotification('District deleted successfully.', 'success');
            this.loadDistricts();
          },
          error: () => this.showNotification('Failed to delete district.', 'error')
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
