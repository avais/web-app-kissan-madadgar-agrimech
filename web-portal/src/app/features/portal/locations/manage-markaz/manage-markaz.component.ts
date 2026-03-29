import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { MarkazService, Markaz } from '../../../../core/services/markaz.service';
import { DistrictService, District } from '../../../../core/services/district.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-manage-tehsil',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    HttpClientModule,
    RouterModule
  ],
  template: `
    <div class="location-page">
      <div class="loader-overlay" *ngIf="isLoading()">
        <div class="loader-container">
          <mat-spinner diameter="50" strokeWidth="5"></mat-spinner>
          <div class="loader-text">
            <h3>Syncing Tehsil Data</h3>
            <p>Gathering geographic boundaries from server...</p>
          </div>
        </div>
      </div>
 
      <div class="header">
        <div class="title-section">
          <h1>Manage Tehsils</h1>
          <p>Register and oversee local service points and agriculture centers.</p>
        </div>
        <button mat-flat-button color="primary" class="add-btn" (click)="registerTehsil()">
          <mat-icon>add</mat-icon> Add New Tehsil
        </button>
      </div>

      <div class="filters">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search Tehsil</mat-label>
          <input matInput placeholder="Search by name or code..." (keyup)="applyFilter($event)">
          <mat-icon matPrefix>search</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="select-field">
          <mat-label>Filter by District</mat-label>
          <mat-select (selectionChange)="onDistrictFilter($event.value)">
            <mat-option value="all">All Districts</mat-option>
            <mat-option *ngFor="let dist of districts" [value]="dist.id">
              {{dist.name}}
            </mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <mat-card class="table-card">
        <table mat-table [dataSource]="dataSource">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef class="text-center"> Tehsil Name </th>
            <td mat-cell *matCellDef="let element" class="text-center"> 
                <div class="name-cell">
                    <mat-icon class="icon">location_on</mat-icon>
                    <span>{{element.name}}</span>
                </div>
            </td>
          </ng-container>
 
          <ng-container matColumnDef="nameUrdu">
            <th mat-header-cell *matHeaderCellDef class="text-center"> Tehsil (Urdu) </th>
            <td mat-cell *matCellDef="let element" class="text-center urdu-text"> {{element.nameUrdu}} </td>
          </ng-container>

          <ng-container matColumnDef="code">
            <th mat-header-cell *matHeaderCellDef class="text-center"> Code </th>
            <td mat-cell *matCellDef="let element" class="text-center"> 
                <span class="badge-rounded code-badge">{{element.code}}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="district">
            <th mat-header-cell *matHeaderCellDef class="text-center"> Parent District </th>
            <td mat-cell *matCellDef="let element" class="text-center"> 
                <span class="district-badge">{{element.districtName}}</span>
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
              <button mat-icon-button color="primary" (click)="editTehsil(element)" title="Edit"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button color="warn" (click)="deleteTehsil(element)" title="Delete"><mat-icon>delete</mat-icon></button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <div class="empty-state" *ngIf="dataSource.filteredData.length === 0 && !isLoading()">
          <mat-icon>location_off</mat-icon>
          <h3>No Tehsil Found</h3>
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
    .area-cell { 
        display: flex; flex-direction: column; align-items: center; gap: 2px;
        .main-val { font-size: 13px; font-weight: 800; color: #1e293b; font-family: monospace; }
        .sub-val { font-size: 11px; color: #64748b; font-weight: 600; }
    }
    .no-boundary { color: #cbd5e1; font-style: italic; font-size: 12px; }
    .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; background: #fee2e2; color: #991b1b; &.active { background: #dcfce7; color: #166534; } }
    .district-badge { background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; }
    .badge-rounded { padding: 4px 14px; border-radius: 12px; font-size: 13px; font-weight: 800; display: inline-block; min-width: 40px; }
    .code-badge { background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; }
    .urdu-text { font-family: 'Noto Sans Arabic', sans-serif; font-size: 17px; font-weight: 600; color: #1e293b; }
    th { color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    td { height: 75px; border-bottom: 1px solid #f1f5f9; }
    .loader-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; border-radius: 20px; .loader-container { display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; .loader-text { h3 { font-size: 18px; font-weight: 800; color: #1e293b; margin: 0; } p { color: #64748b; font-size: 14px; margin: 4px 0 0; } } } }
    .empty-state { padding: 48px; text-align: center; color: #64748b; mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5; } h3 { font-size: 20px; font-weight: 700; color: #1e293b; margin: 0; } p { margin: 8px 0 0; } }
    ::ng-deep { .mat-mdc-progress-spinner circle { stroke: #4CAF50 !important; } }
  `]
})
export class ManageTehsilComponent implements OnInit {
  private markazService = inject(MarkazService);
  private districtService = inject(DistrictService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  displayedColumns = ['name', 'nameUrdu', 'code', 'district', 'status', 'actions'];
  dataSource = new MatTableDataSource<Markaz>([]);
  districts: District[] = [];
  isLoading = signal(false);

  ngOnInit() {
    this.loadTehsils();
    this.districtService.getDistricts().subscribe(data => this.districts = data);
  }

  loadTehsils() {
    this.isLoading.set(true);
    this.markazService.getMarkazin()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => this.dataSource.data = data,
        error: () => this.showNotification('Failed to load tehsils.', 'error')
      });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  onDistrictFilter(districtId: any) {
    if (districtId === 'all') {
      this.dataSource.filter = '';
    } else {
      const district = this.districts.find(d => d.id === districtId);
      if (district) this.dataSource.filter = district.name.toLowerCase();
    }
  }

  registerTehsil() {
    this.router.navigate(['/portal/locations/tehsil/register']);
  }

  editTehsil(markaz: Markaz) {
    this.router.navigate(['/portal/locations/tehsil/edit', markaz.id]);
  }

  deleteTehsil(markaz: Markaz) {
    if (markaz.id && confirm(`Are you sure you want to delete ${markaz.name}?`)) {
      this.isLoading.set(true);
      this.markazService.deleteMarkaz(markaz.id)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: () => {
            this.showNotification('Tehsil deleted successfully.', 'success');
            this.loadTehsils();
          },
          error: () => this.showNotification('Failed to delete tehsil.', 'error')
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
