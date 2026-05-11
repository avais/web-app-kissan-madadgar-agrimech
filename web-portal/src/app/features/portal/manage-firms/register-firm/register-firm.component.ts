import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';

import { RegionService, Region } from '../../../../core/services/region.service';
import { DivisionService, Division } from '../../../../core/services/division.service';
import { DistrictService, District } from '../../../../core/services/district.service';
import { MarkazService, Markaz } from '../../../../core/services/markaz.service';
import { ImplementService } from '../../../../core/services/implement.service';
import { FirmService } from '../../../../core/services/firm.service';
import { Implement } from '../../../../core/models/implement.model';
import { UserService } from '../../../../core/services/user.service';
import { User } from '../../../../core/models/user.model';

@Component({
  selector: 'app-register-firm',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatCheckboxModule,
    MatIconModule, MatProgressSpinnerModule, MatSnackBarModule, RouterModule, MatSlideToggleModule
  ],
  template: `
    <div class="register-container">
      <div class="loader-overlay" *ngIf="isLoading()">
        <div class="loader-container">
          <mat-spinner diameter="50" strokeWidth="5"></mat-spinner>
          <div class="loader-text">
            <h3>Processing Registration</h3>
            <p>Onboarding firm and establishing governance...</p>
          </div>
        </div>
      </div>

      <div class="header">
        <button mat-icon-button routerLink="/portal/manufacturers" title="Back"><mat-icon>arrow_back</mat-icon></button>
        <h1 class="title">{{editMode() ? 'Edit Manufacturer / Firm' : 'Register New Manufacturer / Firm'}}</h1>
      </div>

      <mat-card class="form-card">
        <form [formGroup]="firmForm" (ngSubmit)="onSubmit()">
          <div class="section-title">Basic Information</div>
          <div class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Name of Firm</mat-label>
              <input matInput formControlName="name" placeholder="e.g. Pak Agri Tech" required>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Email Address</mat-label>
              <input matInput type="email" formControlName="email" placeholder="email@firm.com" required>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Physical Address</mat-label>
              <textarea matInput formControlName="address" rows="2" placeholder="Street, City, Building..."></textarea>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Mobile / Phone Number</mat-label>
              <input matInput formControlName="phone" placeholder="e.g. +92 3XX XXXXXXX">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>NTN (National Tax No.)</mat-label>
              <input matInput formControlName="ntn" placeholder="e.g. 3348533-0">
              <mat-hint>FBR national tax number</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>STRN (Sales Tax Reg. No.)</mat-label>
              <input matInput formControlName="strn" placeholder="e.g. 3277876295935">
              <mat-hint>Sales tax registration</mat-hint>
            </mat-form-field>

            <div class="settings-panel">
              <div class="setting-item" [class.is-active]="firmForm.get('active')?.value">
                <div class="info">
                  <span class="label">Firm Status: <span class="status-text">{{firmForm.get('active')?.value ? 'ENABLED' : 'DISABLED'}}</span></span>
                  <span class="desc">Active firms are visible and can process bookings.</span>
                </div>
                <mat-slide-toggle formControlName="active" color="primary"></mat-slide-toggle>
              </div>
            </div>

            <mat-form-field appearance="outline">
              <mat-label>Associated Convener*</mat-label>
              <mat-select formControlName="convenerId" required>
                <mat-option *ngFor="let c of conveners()" [value]="c.id">
                  {{c.firstName}} {{c.lastName}} ({{c.username}})
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="section-title">Localized Hierarchy</div>
          <div class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Region</mat-label>
              <mat-select formControlName="regionId" (selectionChange)="onRegionChange($event.value)">
                <mat-option *ngFor="let region of (regions() || [])" [value]="region.id">{{region.name}}</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Division</mat-label>
              <mat-select formControlName="divisionId" [disabled]="!firmForm.get('regionId')?.value" (selectionChange)="onDivisionChange($event.value)">
                <mat-option *ngFor="let div of (divisions() || [])" [value]="div.id">{{div.name}}</mat-option>
              </mat-select>
              <div matSuffix *ngIf="isDivisionLoading()" style="padding-right: 8px;">
                <mat-spinner diameter="20" strokeWidth="3"></mat-spinner>
              </div>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>District</mat-label>
              <mat-select formControlName="districtId" [disabled]="!firmForm.get('divisionId')?.value" (selectionChange)="onDistrictChange($event.value)">
                <mat-option *ngFor="let dist of (districts() || [])" [value]="dist.id">{{dist.name}}</mat-option>
              </mat-select>
              <div matSuffix *ngIf="isDistrictLoading()" style="padding-right: 8px;">
                <mat-spinner diameter="20" strokeWidth="3"></mat-spinner>
              </div>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Markaz (Tehsil)</mat-label>
              <mat-select formControlName="markazId" [disabled]="!firmForm.get('districtId')?.value">
                <mat-option *ngFor="let m of (markazin() || [])" [value]="m.id">{{m.name}}</mat-option>
              </mat-select>
              <div matSuffix *ngIf="isMarkazLoading()" style="padding-right: 8px;">
                <mat-spinner diameter="20" strokeWidth="3"></mat-spinner>
              </div>
            </mat-form-field>
          </div>

          <div class="section-title">Interests & User Access</div>
          <div class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Interested Districts</mat-label>
              <mat-select formControlName="interestedDistrictIds" multiple>
                <div class="search-container" style="position: sticky; top: 0; background: white; z-index: 100; border-bottom: 1px solid #f1f5f9;">
                  <div style="padding: 12px 16px;">
                    <input #distSearch matInput placeholder="Search Districts..." (keyup)="0" style="font-size: 14px; width: 100%; border: none; outline: none; background: #f8fafc; padding: 10px 16px; border-radius: 24px; color: #1e293b; font-weight: 500;">
                  </div>
                  <mat-option class="select-all-option" (click)="toggleAllDistricts(); $event.stopPropagation()">
                    <mat-checkbox [checked]="isAllDistrictsSelected()" 
                                  [indeterminate]="isSomeDistrictsSelected()"
                                  (change)="toggleAllDistricts()"
                                  (click)="$event.stopPropagation()"
                                  color="primary"
                                  class="custom-check">
                      <span class="opt-label">Select All Districts</span>
                    </mat-checkbox>
                  </mat-option>
                </div>
                <mat-select-trigger>
                  {{getSelectedDistrictName()}}
                  <span *ngIf="(firmForm.get('interestedDistrictIds')?.value?.length || 0) > 1" class="additional-selection">
                    (+{{(firmForm.get('interestedDistrictIds')?.value?.length || 0) - 1}} {{(firmForm.get('interestedDistrictIds')?.value?.length || 0) === 2 ? 'other' : 'others'}})
                  </span>
                </mat-select-trigger>
                <mat-option *ngFor="let dist of filteredDistricts(distSearch.value)" [value]="dist.id">{{dist.name}}</mat-option>
              </mat-select>
              <mat-hint>Select all districts where firm operates</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Interested Implements</mat-label>
              <mat-select formControlName="interestedImplementIds" multiple>
                <div class="search-container" style="position: sticky; top: 0; background: white; z-index: 100; border-bottom: 1px solid #f1f5f9;">
                  <div style="padding: 12px 16px;">
                    <input #impSearch matInput placeholder="Search Implements..." (keyup)="0" style="font-size: 14px; width: 100%; border: none; outline: none; background: #f8fafc; padding: 10px 16px; border-radius: 24px; color: #1e293b; font-weight: 500;">
                  </div>
                  <mat-option class="select-all-option" (click)="toggleAllImplements(); $event.stopPropagation()">
                    <mat-checkbox [checked]="isAllImplementsSelected()" 
                                  [indeterminate]="isSomeImplementsSelected()"
                                  (change)="toggleAllImplements()"
                                  (click)="$event.stopPropagation()"
                                  color="primary"
                                  class="custom-check">
                      <span class="opt-label">Select All Implements</span>
                    </mat-checkbox>
                  </mat-option>
                </div>
                <mat-select-trigger>
                  {{getSelectedImplementName()}}
                  <span *ngIf="(firmForm.get('interestedImplementIds')?.value?.length || 0) > 1" class="additional-selection">
                    (+{{(firmForm.get('interestedImplementIds')?.value?.length || 0) - 1}} {{(firmForm.get('interestedImplementIds')?.value?.length || 0) === 2 ? 'other' : 'others'}})
                  </span>
                </mat-select-trigger>
                <mat-option *ngFor="let imp of filteredImplements(impSearch.value)" [value]="imp.id">{{imp.name}}</mat-option>
              </mat-select>
              <mat-hint>Select machinery the firm provides</mat-hint>
            </mat-form-field>

            <div class="checkbox-area" [class.disabled]="firmHasUser()">
              <mat-checkbox formControlName="createNewUser" color="primary" [disabled]="firmHasUser()">
                {{ firmHasUser() ? 'User Account Already Exists' : 'Create New User for this Firm?' }}
              </mat-checkbox>
              <p class="hint">{{ firmHasUser() ? 'This firm already has an associated user account.' : 'An account will be created using the email address as username.' }}</p>
            </div>
          </div>

          <div class="actions">
            <button mat-button type="button" routerLink="/portal/manufacturers">Cancel</button>
            <button mat-raised-button color="primary" type="submit" [disabled]="firmForm.invalid">
              <mat-icon>{{editMode() ? 'save' : 'check_circle'}}</mat-icon> {{editMode() ? 'Update' : 'Register'}} Firm
            </button>
          </div>
        </form>
      </mat-card>
    </div>
  `,
  styles: [`
    .register-container { position: relative; padding: 24px; max-width: 900px; margin: 0 auto; min-height: 400px; }
    .loader-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(8px);
      z-index: 9999; display: flex; align-items: center; justify-content: center;
      .loader-container {
        display: flex; flex-direction: column; align-items: center; gap: 24px; text-align: center;
        .loader-text { h3 { font-size: 20px; font-weight: 900; color: #1e293b; margin: 0; } p { color: #64748b; font-size: 15px; font-weight: 500; margin: 6px 0 0; } }
      }
    }
    .header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .title { margin: 0; font-size: 24px; font-weight: 500; }
    .form-card { padding: 32px; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .section-title { font-size: 14px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .full-width { grid-column: span 2; }
    .status-text {
      margin-left: 8px; font-weight: 900;
      color: #ef4444; /* Default Disabled */
    }
    .is-active .status-text { color: #10b981; }
    
    .checkbox-area {
      grid-column: span 2; padding: 20px; background: #f8fafc; border-radius: 16px; border: 1.5px solid #f1f5f9;
      &.disabled { opacity: 0.8; background: #f1f5f9; }
      .hint { margin: 8px 0 0 32px; font-size: 13px; color: #64748b; font-weight: 500; }
    }
    
    .actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #f1f5f9; }
    mat-form-field { width: 100%; }
    .additional-selection { opacity: 0.6; font-size: 0.9em; font-style: italic; margin-left: 4px; color: #3b82f6; font-weight: 600; }
    .settings-panel {
      background: #f8fafc;
      border-radius: 12px;
      padding: 0 16px;
      border: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      height: 56px; /* Match mat-form-field height */
      margin-top: 0;
      transition: all 0.2s ease;

      &:hover { background: #f1f5f9; border-color: #e2e8f0; }

      .setting-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        
        .info {
          display: flex;
          flex-direction: column;
          gap: 0;
          .label { font-weight: 700; color: #334155; font-size: 13px; line-height: 1.2; }
          .desc { font-size: 10.5px; color: #64748b; line-height: 1.2; }
        }
      }
    }
    .select-all-option {
      height: 48px !important;
      display: flex !important;
      align-items: center !important;
      padding: 0 !important;
      background: #fafafa !important;
      border-bottom: 1px solid #f1f5f9;
      &:hover { background: #f1f5f9 !important; }
      ::ng-deep {
        .mat-mdc-option-pseudo-checkbox { display: none !important; }
        .mat-mdc-checkbox-touch-target { display: none !important; }
        .mdc-checkbox { 
          margin-left: 12px !important; 
          margin-right: 4px !important;
        }
        .mdc-label {
          padding-left: 12px !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          color: rgba(0,0,0,0.87) !important;
          letter-spacing: 0.25px !important;
        }
      }
    }
    .custom-check { width: 100%; height: 100%; display: flex; align-items: center; }
  `]
})
export class RegisterFirmComponent implements OnInit {
  private fb = inject(FormBuilder);
  private regionService = inject(RegionService);
  private divisionService = inject(DivisionService);
  private districtService = inject(DistrictService);
  private markazService = inject(MarkazService);
  private implementService = inject(ImplementService);
  private firmService = inject(FirmService);
  private userService = inject(UserService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  firmForm: FormGroup;
  editMode = signal(false);
  firmId = signal<number | null>(null);
  isLoading = signal(false);
  isDivisionLoading = signal(false);
  isDistrictLoading = signal(false);
  isMarkazLoading = signal(false);
  firmHasUser = signal(false);

  // Data Signals
  regions = signal<Region[]>([]);
  divisions = signal<Division[]>([]);
  districts = signal<District[]>([]);
  markazin = signal<Markaz[]>([]);
  allDistricts = signal<District[]>([]); // For multi-select
  implements = signal<Implement[]>([]);
  conveners = signal<User[]>([]);

  constructor() {
    this.firmForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      address: [''],
      phone: [''],
      ntn: [''],
      strn: [''],
      active: [true],
      regionId: [null, Validators.required],
      divisionId: [{ value: null, disabled: true }, Validators.required],
      districtId: [{ value: null, disabled: true }, Validators.required],
      markazId: [{ value: null, disabled: true }, Validators.required],
      convenerId: [null, Validators.required],
      interestedDistrictIds: [[]],
      interestedImplementIds: [[]],
      createNewUser: [false]
    });
  }

  ngOnInit() {
    this.loadInitialData();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editMode.set(true);
      this.firmId.set(Number(id));
      this.loadFirmForEdit(Number(id));
    }
  }

  loadFirmForEdit(id: number) {
    this.isLoading.set(true);
    this.firmService.getFirmById(id)
      .subscribe({
        next: (firm) => {
          this.firmHasUser.set(!!firm.hasUser);
          this.firmForm.patchValue({
            name: firm.name,
            email: firm.email,
            address: firm.address,
            phone: firm.phone,
            ntn: firm.ntn ?? '',
            strn: firm.strn ?? '',
            active: firm.active,
            convenerId: firm.convenerId,
            interestedDistrictIds: firm.interestedDistrictIds,
            interestedImplementIds: firm.interestedImplementIds,
            createNewUser: false // Reset user creation option
          });

          if (firm.markazId) {
            this.loadLocationHierarchy(firm.markazId);
          } else {
            this.isLoading.set(false);
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          console.error('Error loading firm data', err);
          this.snackBar.open('Could not load firm data.', 'Close', { duration: 3000 });
          this.router.navigate(['/portal/manufacturers']);
        }
      });
  }

  loadLocationHierarchy(markazId: number) {
    this.isDistrictLoading.set(true);
    // Use markazId to find the districtId, then load the hierarchy
    this.markazService.getMarkazById(markazId).subscribe({
      next: (markaz) => {
        const districtId = markaz.districtId;
        this.districtService.getDistricts().subscribe(allDistricts => {
          const district = allDistricts.find(d => d.id === districtId);
          if (district) {
            this.divisionService.getDivisions().subscribe(allDivisions => {
              const division = allDivisions.find(div => div.id === district.divisionId);
              if (division) {
                const regionId = division.regionId;
                const divisionId = division.id;

                this.divisionService.getDivisionsByRegion(regionId).subscribe(divs => {
                  this.divisions.set(divs);
                  this.firmForm.get('divisionId')?.enable();

                  this.districtService.getDistrictsByDivision(divisionId!).subscribe(dists => {
                    this.districts.set(dists);
                    this.firmForm.get('districtId')?.enable();

                    this.markazService.getMarkazByDistrict(districtId).subscribe(mks => {
                      this.markazin.set(mks);
                      this.firmForm.get('markazId')?.enable();

                      this.firmForm.patchValue({
                        regionId: regionId,
                        divisionId: divisionId,
                        districtId: districtId,
                        markazId: markazId
                      });
                      this.isDistrictLoading.set(false);
                      this.isLoading.set(false);
                    });
                  });
                });
              }
            });
          }
        });
      },
      error: () => {
        this.isDistrictLoading.set(false);
        this.isLoading.set(false);
      }
    });
  }

  loadInitialData() {
    this.isLoading.set(true);
    const id = this.route.snapshot.paramMap.get('id');
    this.regionService.getRegions().subscribe(data => this.regions.set(data));
    this.districtService.getDistricts().subscribe(data => this.allDistricts.set(data));
    this.userService.getConveners().subscribe(data => this.conveners.set(data));
    this.implementService.getAll().pipe(finalize(() => {
      if (!id) this.isLoading.set(false);
    })).subscribe(data => this.implements.set(data));
  }

  onRegionChange(regionId: number) {
    this.firmForm.patchValue({ divisionId: null, districtId: null });
    this.firmForm.get('divisionId')?.enable();
    this.isDivisionLoading.set(true);
    this.divisionService.getDivisionsByRegion(regionId)
      .pipe(finalize(() => this.isDivisionLoading.set(false)))
      .subscribe(data => this.divisions.set(data));
  }

  onDivisionChange(divisionId: number) {
    this.firmForm.patchValue({ districtId: null, markazId: null });
    this.firmForm.get('districtId')?.enable();
    this.isDistrictLoading.set(true);
    this.districtService.getDistrictsByDivision(divisionId)
      .pipe(finalize(() => this.isDistrictLoading.set(false)))
      .subscribe(data => this.districts.set(data));
  }

  onDistrictChange(districtId: number) {
    this.firmForm.patchValue({ markazId: null });
    this.firmForm.get('markazId')?.enable();
    this.isMarkazLoading.set(true);
    this.markazService.getMarkazByDistrict(districtId)
      .pipe(finalize(() => this.isMarkazLoading.set(false)))
      .subscribe(data => this.markazin.set(data));
  }

  getSelectedDistrictName(): string {
    const ids = this.firmForm.get('interestedDistrictIds')?.value;
    if (!ids || ids.length === 0) return '';
    return this.allDistricts().find(d => d.id === ids[0])?.name || '';
  }

  getSelectedImplementName(): string {
    const ids = this.firmForm.get('interestedImplementIds')?.value;
    if (!ids || ids.length === 0) return '';
    return this.implements().find(i => i.id === ids[0])?.name || '';
  }

  filteredDistricts(query: string): District[] {
    if (!query) return this.allDistricts();
    return this.allDistricts().filter(d => d.name.toLowerCase().includes(query.toLowerCase()));
  }

  filteredImplements(query: string): Implement[] {
    if (!query) return this.implements();
    return this.implements().filter(i => i.name.toLowerCase().includes(query.toLowerCase()));
  }

  isAllDistrictsSelected(): boolean {
    const selected = this.firmForm.get('interestedDistrictIds')?.value || [];
    return selected.length === this.allDistricts().length && this.allDistricts().length > 0;
  }

  isSomeDistrictsSelected(): boolean {
    const selected = this.firmForm.get('interestedDistrictIds')?.value || [];
    return selected.length > 0 && selected.length < this.allDistricts().length;
  }

  toggleAllDistricts() {
    if (this.isAllDistrictsSelected()) {
      this.firmForm.get('interestedDistrictIds')?.setValue([]);
    } else {
      this.firmForm.get('interestedDistrictIds')?.setValue(this.allDistricts().map(d => d.id));
    }
  }

  isAllImplementsSelected(): boolean {
    const selected = this.firmForm.get('interestedImplementIds')?.value || [];
    return selected.length === this.implements().length && this.implements().length > 0;
  }

  isSomeImplementsSelected(): boolean {
    const selected = this.firmForm.get('interestedImplementIds')?.value || [];
    return selected.length > 0 && selected.length < this.implements().length;
  }

  toggleAllImplements() {
    if (this.isAllImplementsSelected()) {
      this.firmForm.get('interestedImplementIds')?.setValue([]);
    } else {
      this.firmForm.get('interestedImplementIds')?.setValue(this.implements().map(i => i.id));
    }
  }

  onSubmit() {
    if (this.firmForm.valid) {
      this.isLoading.set(true);
      const isEdit = this.editMode();
      const firmId = this.firmId();

      const request = isEdit && firmId
        ? this.firmService.updateFirm(firmId, this.firmForm.value)
        : this.firmService.createFirm(this.firmForm.value);

      const successMsg = isEdit ? 'Firm updated successfully!' : 'Firm registered successfully!';
      const errorMsg = isEdit ? 'Failed to update firm. Contact Support.' : 'Failed to register firm. Contact Support.';

      request
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: () => {
            this.snackBar.open(successMsg, 'Close', { duration: 3000 });
            this.router.navigate(['/portal/manufacturers']);
          },
          error: (err) => {
            console.error('Firm submit failed', err);
            this.snackBar.open(errorMsg, 'Close', { duration: 3000 });
          }
        });
    }
  }
}
