import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-manage-locations',
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
    MatProgressSpinnerModule
  ],
  template: `
    <div class="location-page">
      <div class="header">
        <div class="title-section">
          <h1>Manage Locations</h1>
          <p>Configure operational districts and tehsils across the region.</p>
        </div>
        <button mat-flat-button color="primary" class="add-btn">
          <mat-icon>add</mat-icon> Add New Location
        </button>
      </div>

      <div class="filters">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search Locations</mat-label>
          <input matInput placeholder="Search by name, district or type..." (keyup)="applySearchFilter($event)">
          <mat-icon matPrefix>search</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="select-field">
          <mat-label>Filter by Type</mat-label>
          <mat-select (selectionChange)="onTypeFilterChange($event.value)" [multiple]="true">
            <mat-option value="Regional Hub">Regional Hub</mat-option>
            <mat-option value="Tehsil Office">Tehsil Office</mat-option>
            <mat-option value="Service Center">Service Center</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <mat-card class="table-card">
        <table mat-table [dataSource]="dataSource">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef class="text-center"> Location Name </th>
            <td mat-cell *matCellDef="let element" class="text-center"> 
                <div class="name-cell">
                    <mat-icon class="icon">location_on</mat-icon>
                    <span>{{element.name}}</span>
                </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="district">
            <th mat-header-cell *matHeaderCellDef class="text-center"> District </th>
            <td mat-cell *matCellDef="let element" class="text-center"> 
                <span class="district-badge">{{element.district}}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="type">
            <th mat-header-cell *matHeaderCellDef class="text-center"> Location Type </th>
            <td mat-cell *matCellDef="let element" class="text-center"> 
                <span class="badge-rounded type-badge">{{element.type}}</span>
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
              <button mat-icon-button color="primary" title="Edit"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button color="warn" title="Delete"><mat-icon>delete</mat-icon></button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <div class="empty-state" *ngIf="dataSource.filteredData.length === 0">
          <mat-icon>location_off</mat-icon>
          <h3>No Locations Found</h3>
          <p>No geographic records match your current criteria.</p>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .location-page { position: relative; display: flex; flex-direction: column; gap: 24px; min-height: 400px; padding: 24px; }
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
    .district-badge { background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; }
    .badge-rounded { padding: 4px 14px; border-radius: 12px; font-size: 13px; font-weight: 800; display: inline-block; min-width: 40px; }
    .type-badge { background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; }
    th { color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
    td { height: 75px; border-bottom: 1px solid #f1f5f9; }
    .empty-state { padding: 48px; text-align: center; color: #64748b; mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5; } h3 { font-size: 20px; font-weight: 700; color: #1e293b; margin: 0; } p { margin: 8px 0 0; } }
    ::ng-deep { .mat-mdc-progress-spinner circle { stroke: #4CAF50 !important; } }
  `]
})
export class ManageLocationsComponent {
  displayedColumns = ['name', 'district', 'type', 'status', 'actions'];
  dataSource = new MatTableDataSource([
    { name: 'Multan Center', district: 'Multan', type: 'Regional Hub', active: true },
    { name: 'Sargodha North', district: 'Sargodha', type: 'Tehsil Office', active: true },
    { name: 'Faisalabad Main', district: 'Faisalabad', type: 'Regional Hub', active: true },
    { name: 'Bhakkar West', district: 'Bhakkar', type: 'Tehsil Office', active: false },
    { name: 'Lahore East', district: 'Lahore', type: 'Service Center', active: true },
  ]);

  private filterValues = {
    search: '',
    types: [] as string[]
  };

  constructor() {
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      const searchTerms = JSON.parse(filter);
      const matchesSearch = !searchTerms.search ||
        data.name.toLowerCase().includes(searchTerms.search) ||
        data.district.toLowerCase().includes(searchTerms.search) ||
        data.type.toLowerCase().includes(searchTerms.search);

      const matchesTypes = searchTerms.types.length === 0 ||
        searchTerms.types.includes(data.type);

      return matchesSearch && matchesTypes;
    };
    this.dataSource.filter = JSON.stringify(this.filterValues);
  }

  applySearchFilter(event: Event) {
    this.filterValues.search = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.dataSource.filter = JSON.stringify(this.filterValues);
  }

  onTypeFilterChange(selectedTypes: string[]) {
    this.filterValues.types = selectedTypes;
    this.dataSource.filter = JSON.stringify(this.filterValues);
  }
}
