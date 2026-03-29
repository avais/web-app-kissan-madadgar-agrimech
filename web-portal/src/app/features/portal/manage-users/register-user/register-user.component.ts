import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { UserService } from '../../../../core/services/user.service';
import { User } from '../../../../core/models/user.model';
import { RoleService, Role } from '../../../../core/services/role.service';
import { FirmService } from '../../../../core/services/firm.service';
import { Firm } from '../../../../core/models/firm.model';
import { RegionService, Region } from '../../../../core/services/region.service';
import { DivisionService, Division } from '../../../../core/services/division.service';
import { DistrictService, District } from '../../../../core/services/district.service';
import { MarkazService, Markaz } from '../../../../core/services/markaz.service';
import { ProjectTypeService, ProjectType } from '../../../../core/services/project-type.service';


@Component({
  selector: 'app-register-user',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule, RouterModule, MatSlideToggleModule
  ],
  template: `
    <div class="register-container">
      <div class="loader-overlay" *ngIf="isLoading()">
        <div class="loader-container">
          <mat-spinner diameter="50" strokeWidth="5"></mat-spinner>
          <div class="loader-text">
            <h3>{{isEdit ? 'Updating' : 'Provisioning'}} User</h3>
            <p>Configuring security profiles and entity links...</p>
          </div>
        </div>
      </div>

      <div class="header">
        <button mat-icon-button routerLink="/portal/users" title="Back"><mat-icon>arrow_back</mat-icon></button>
        <h1 class="title">{{isEdit ? 'Update Identity' : 'Provision New Identity'}}</h1>
      </div>

      <mat-card class="form-card">
        <form [formGroup]="userForm" (ngSubmit)="onSubmit()">
          <div class="section-title">Account Credentials</div>
          <div class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Username / Email</mat-label>
              <input matInput formControlName="username" placeholder="e.g. john.doe@agritrack.com" required>
            </mat-form-field>

            <div class="settings-panel">
              <div class="setting-item">
                <div class="info">
                  <span class="label">Operational Status</span>
                  <span class="desc">Active users can access the system.</span>
                </div>
                <mat-slide-toggle formControlName="active" color="primary"></mat-slide-toggle>
              </div>
            </div>
          </div>

          <div class="section-title">Personal Profile</div>
          <div class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>First Name</mat-label>
              <input matInput formControlName="firstName" placeholder="e.g. John" required>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Last Name</mat-label>
              <input matInput formControlName="lastName" placeholder="e.g. Doe" required>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Contact No</mat-label>
              <input matInput formControlName="phone" placeholder="e.g. +92 3XX XXXXXXX">
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Designation</mat-label>
              <input matInput formControlName="designation" placeholder="e.g. Field Officer">
            </mat-form-field>
          </div>

          <div class="section-title">Localized Hierarchy</div>
          <div class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Region</mat-label>
              <mat-select formControlName="regionId" (selectionChange)="onRegionChange($event.value)" required>
                <mat-option *ngFor="let reg of regions()" [value]="reg.id">{{reg.name}}</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Division</mat-label>
              <mat-select formControlName="divisionId" [disabled]="!userForm.get('regionId')?.value" (selectionChange)="onDivisionChange($event.value)" required>
                <mat-option *ngFor="let div of (divisions() || [])" [value]="div.id">{{div.name}}</mat-option>
              </mat-select>
              <div matSuffix *ngIf="isDivisionLoading()" style="padding-right: 8px;">
                <mat-spinner diameter="20" strokeWidth="2"></mat-spinner>
              </div>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>District</mat-label>
              <mat-select formControlName="districtId" [disabled]="!userForm.get('divisionId')?.value" (selectionChange)="onDistrictChange($event.value)" required>
                <mat-option *ngFor="let dist of (districts() || [])" [value]="dist.id">{{dist.name}}</mat-option>
              </mat-select>
              <div matSuffix *ngIf="isDistrictLoading()" style="padding-right: 8px;">
                <mat-spinner diameter="20" strokeWidth="2"></mat-spinner>
              </div>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Tehsil</mat-label>
              <mat-select formControlName="markazId" [disabled]="!userForm.get('districtId')?.value" required>
                <mat-option *ngFor="let m of (tehsils() || [])" [value]="m.id">{{m.name}}</mat-option>
              </mat-select>
              <div matSuffix *ngIf="isTehsilLoading()" style="padding-right: 8px;">
                <mat-spinner diameter="20" strokeWidth="2"></mat-spinner>
              </div>
            </mat-form-field>
          </div>

          <div class="section-title">Access Control</div>
          <div class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Assigned Role</mat-label>
              <mat-select formControlName="roleIds" required>
                <mat-option *ngFor="let role of roles()" [value]="role.id">{{role.name}}</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>User Context</mat-label>
              <mat-select formControlName="userType">
                <mat-option value="USER">Standalone Staff</mat-option>
                <mat-option value="FIRM">Firm Associated</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Assigned Project Types</mat-label>
              <mat-select formControlName="projectTypeIds" multiple required>
                <mat-option *ngFor="let pt of projectTypes()" [value]="pt.id">{{pt.name}}</mat-option>
              </mat-select>
            </mat-form-field>
          </div>


          <div class="section-title" *ngIf="userForm.get('userType')?.value === 'FIRM'">Firm Association</div>
          <div class="form-grid" *ngIf="userForm.get('userType')?.value === 'FIRM'">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Select Parent Firm</mat-label>
              <mat-select formControlName="firmId" [required]="userForm.get('userType')?.value === 'FIRM'">
                <mat-option *ngFor="let firm of firms()" [value]="firm.id">{{firm.name}}</mat-option>
              </mat-select>
              <mat-hint>This user will have access limited to this manufacturer's data.</mat-hint>
            </mat-form-field>
          </div>

          <div class="actions">
            <button mat-button type="button" routerLink="/portal/users">Cancel</button>
            <button mat-raised-button color="primary" type="submit" [disabled]="userForm.invalid">
              <mat-icon>{{isEdit ? 'save' : 'how_to_reg'}}</mat-icon>
              {{isEdit ? 'Update Account' : 'Provision Account'}}
            </button>
          </div>
        </form>
      </mat-card>
    </div>
  `,
  styles: [`
    .register-container { position: relative; padding: 24px; max-width: 800px; margin: 0 auto; min-height: 400px; }
    .loader-overlay {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(4px);
      z-index: 100; display: flex; align-items: center; justify-content: center;
      border-radius: 20px;
    }
    .header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .title { margin: 0; font-size: 24px; font-weight: 500; }
    .form-card { padding: 32px; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .section-title { font-size: 14px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .full-width { grid-column: span 2; }
    .actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #f1f5f9; }
    .settings-panel { 
      padding: 0 16px; background: #f8fafc; border-radius: 12px; margin-top: 0; 
      height: 56px; display: flex; align-items: center; border: 1px solid #f1f5f9;
      transition: all 0.2s ease;
      &:hover { background: #f1f5f9; }
    }
    .setting-item { 
      display: flex; justify-content: space-between; align-items: center; width: 100%;
      .info { display: flex; flex-direction: column; .label { font-weight: 700; color: #334155; font-size: 13px; line-height: 1.2; } .desc { font-size: 10.5px; color: #64748b; line-height: 1.2; } }
    }
    mat-form-field { width: 100%; }
  `]
})
export class RegisterUserComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private roleService = inject(RoleService);
  private firmService = inject(FirmService);
  private regionService = inject(RegionService);
  private divisionService = inject(DivisionService);
  private districtService = inject(DistrictService);
  private markazService = inject(MarkazService);
  private projectTypeService = inject(ProjectTypeService);
  private snackBar = inject(MatSnackBar);

  private router = inject(Router);
  private route = inject(ActivatedRoute);

  userForm: FormGroup;
  isLoading = signal(false);
  isDivisionLoading = signal(false);
  isDistrictLoading = signal(false);
  isTehsilLoading = signal(false);
  isEdit = false;
  userId?: number;

  roles = signal<Role[]>([]);
  firms = signal<Firm[]>([]);
  regions = signal<Region[]>([]);
  divisions = signal<Division[]>([]);
  districts = signal<District[]>([]);
  tehsils = signal<Markaz[]>([]);
  projectTypes = signal<ProjectType[]>([]);


  constructor() {
    this.userForm = this.fb.group({
      username: ['', [Validators.required, Validators.email]],
      roleIds: [null, Validators.required],
      userType: ['USER'],
      firmId: [null],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phone: [''],
      designation: [''],
      active: [true],
      regionId: [null, Validators.required],
      divisionId: [{ value: null, disabled: true }, Validators.required],
      districtId: [{ value: null, disabled: true }, Validators.required],
      markazId: [{ value: null, disabled: true }, Validators.required],
      projectTypeIds: [[], Validators.required]
    });

  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.loadMetadata();
      const id = params['id'];
      if (id) {
        this.isEdit = true;
        this.userId = +id;
        this.loadUser(this.userId);
      } else {
        this.isEdit = false;
        this.userId = undefined;
        this.userForm.reset({ active: true, userType: 'USER' });
      }
    });
  }

  loadMetadata() {
    this.roleService.getRoles().subscribe(data => this.roles.set(data));
    this.firmService.getFirms(0, 500).subscribe(data => this.firms.set(data.content));
    this.regionService.getRegions().subscribe(data => this.regions.set(data));
    this.projectTypeService.getProjectTypes().subscribe(data => this.projectTypes.set(data));
  }


  onRegionChange(regionId: number) {
    this.userForm.patchValue({ divisionId: null, districtId: null, markazId: null });
    this.userForm.get('divisionId')?.enable();
    this.isDivisionLoading.set(true);
    this.divisionService.getDivisionsByRegion(regionId)
      .pipe(finalize(() => this.isDivisionLoading.set(false)))
      .subscribe((data: Division[]) => this.divisions.set(data));
  }

  onDivisionChange(divisionId: number) {
    this.userForm.patchValue({ districtId: null, markazId: null });
    this.userForm.get('districtId')?.enable();
    this.isDistrictLoading.set(true);
    this.districtService.getDistrictsByDivision(divisionId)
      .pipe(finalize(() => this.isDistrictLoading.set(false)))
      .subscribe((data: District[]) => this.districts.set(data));
  }

  onDistrictChange(districtId: number) {
    this.userForm.patchValue({ markazId: null });
    this.userForm.get('markazId')?.enable();
    this.isTehsilLoading.set(true);
    this.markazService.getMarkazByDistrict(districtId)
      .pipe(finalize(() => this.isTehsilLoading.set(false)))
      .subscribe((data: Markaz[]) => this.tehsils.set(data));
  }

  loadUser(id: number) {
    this.isLoading.set(true);
    this.userService.getUserById(id)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe((user: User) => {
        if (user.regionId) {
          this.divisionService.getDivisionsByRegion(user.regionId).subscribe(data => {
            this.divisions.set(data);
            this.userForm.get('divisionId')?.enable();
          });
        }
        if (user.divisionId) {
          this.districtService.getDistrictsByDivision(user.divisionId).subscribe(data => {
            this.districts.set(data);
            this.userForm.get('districtId')?.enable();
          });
        }
        if (user.districtId) {
          this.markazService.getMarkazByDistrict(user.districtId).subscribe(data => {
            this.tehsils.set(data);
            this.userForm.get('markazId')?.enable();
          });
        }

        this.userForm.patchValue({
          username: user.username,
          roleIds: user.roleIds?.[0],
          userType: user.userType,
          firmId: user.firmId,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          designation: user.designation,
          active: user.active,
          regionId: user.regionId,
          divisionId: user.divisionId,
          districtId: user.districtId,
          markazId: user.markazId,
          projectTypeIds: user.projectTypeIds
        });

      });
  }

  onSubmit() {
    if (this.userForm.valid) {
      this.isLoading.set(true);
      const data = this.userForm.getRawValue();
      
      // Ensure roleIds is sent as an array for the backend
      if (data.roleIds && !Array.isArray(data.roleIds)) {
        data.roleIds = [data.roleIds];
      }

      const request$ = this.isEdit
        ? this.userService.updateUser(this.userId!, data)
        : this.userService.createUser(data);

      request$
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: () => {
            this.snackBar.open(`User protocol ${this.isEdit ? 'updated' : 'established'} successfully!`, 'Close', { duration: 3000 });
            this.router.navigate(['/portal/users']);
          },
          error: (err: any) => {
            this.snackBar.open('Security protocol failure. Verify credentials.', 'Close', { duration: 3000 });
          }
        });
    }
  }
}
