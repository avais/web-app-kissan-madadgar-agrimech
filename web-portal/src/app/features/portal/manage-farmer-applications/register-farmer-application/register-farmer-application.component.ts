import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { RouterModule, Router } from '@angular/router';
import { RegionService } from '../../../../core/services/region.service';
import { DivisionService } from '../../../../core/services/division.service';
import { DistrictService } from '../../../../core/services/district.service';
import { ImplementService } from '../../../../core/services/implement.service';
import { MarkazService } from '../../../../core/services/markaz.service';
import { FarmerApplicationService } from '../../../../core/services/farmer-application.service';
import { Implement } from '../../../../core/models/implement.model';
import { forkJoin, finalize, of, switchMap } from 'rxjs';

@Component({
  selector: 'app-register-farmer-application',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatStepperModule,
    MatCheckboxModule,
    MatRadioModule,
    MatProgressSpinnerModule,
    MatButtonToggleModule,
    MatSnackBarModule,
    RouterModule
  ],
  template: `
    <div class="page-wrapper">
      <div class="loader-overlay" *ngIf="isLocationLoading()">
        <div class="loader-container">
          <mat-spinner diameter="50" strokeWidth="5"></mat-spinner>
          <div class="loader-text">
            <h3>{{loaderTitle()}}</h3>
            <p>{{loaderDesc()}}</p>
          </div>
        </div>
      </div>

      <div class="register-container">
        <div class="header">
          <button mat-icon-button (click)="goBack()" class="back-btn" title="Back to previous screen">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="title-section">
            <h1>Register Farmer Application</h1>
            <p>Lifecycle Management System</p>
          </div>
        </div>

        <mat-card class="stepper-card">
          <mat-stepper linear #stepper="matStepper" class="premium-stepper">
            
            <ng-template matStepperIcon="number" let-index="index">
              <mat-icon *ngIf="index === 0">person</mat-icon>
              <mat-icon *ngIf="index === 1">map</mat-icon>
              <mat-icon *ngIf="index === 2">construction</mat-icon>
              <mat-icon *ngIf="index === 3">agriculture</mat-icon>
              <mat-icon *ngIf="index === 4">fact_check</mat-icon>
              <mat-icon *ngIf="index === 5">verified</mat-icon>
            </ng-template>

            <ng-template matStepperIcon="edit">
              <mat-icon>edit</mat-icon>
            </ng-template>

            <ng-template matStepperIcon="done">
              <mat-icon>check_circle</mat-icon>
            </ng-template>

            <mat-step [stepControl]="farmerForm">
              <ng-template matStepLabel>Profile</ng-template>
              <form [formGroup]="farmerForm" class="step-content">
                <div class="form-grid">
                  <div class="section-container full-width">
                    <label class="section-label">CNIC Number (National ID)</label>
                    <div class="cnic-input-group">
                      <div class="cnic-segment">
                        <input *ngFor="let i of [0,1,2,3,4]" type="text" maxlength="1" class="cnic-box" [formControl]="getCnicControl(0, i)" (keyup)="onCnicKeyUp($event, 0, i)" [id]="'cnic-0-'+i">
                      </div>
                      <span class="hyphen">-</span>
                      <div class="cnic-segment">
                        <input *ngFor="let i of [0,1,2,3,4,5,6]" type="text" maxlength="1" class="cnic-box" [formControl]="getCnicControl(1, i)" (keyup)="onCnicKeyUp($event, 1, i)" [id]="'cnic-1-'+i">
                      </div>
                      <span class="hyphen">-</span>
                      <div class="cnic-segment">
                        <input type="text" maxlength="1" class="cnic-box" [formControl]="getCnicControl(2, 0)" (keyup)="onCnicKeyUp($event, 2, 0)" [id]="'cnic-2-0'">
                      </div>
                    </div>
                  </div>
                  
                  <mat-form-field appearance="outline">
                    <mat-label>Farmer Name</mat-label>
                    <input matInput formControlName="farmerName" placeholder="Enter full name">
                    <mat-icon matPrefix>person</mat-icon>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Father Name</mat-label>
                    <input matInput formControlName="fatherName" placeholder="Enter father's name">
                    <mat-icon matPrefix>people</mat-icon>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Contact Number</mat-label>
                    <input matInput formControlName="contactNumber" placeholder="e.g. 03XXXXXXXXX">
                    <mat-icon matPrefix>phone</mat-icon>
                  </mat-form-field>

                  <div class="upload-grid full-width">
                    <div class="upload-item" (click)="frontFileInput.click()">
                      <input type="file" #frontFileInput hidden (change)="onFileSelected($event, 'front')" accept=".pdf,.jpeg,.jpg,.png">
                      <div class="upload-placeholder" *ngIf="!cnicFront">
                        <mat-icon>branding_watermark</mat-icon>
                        <span class="label">Upload CNIC Front</span>
                      </div>
                      <div class="preview-container" *ngIf="cnicFront">
                        <mat-icon>{{isFileImage(cnicFront) ? 'image' : 'picture_as_pdf'}}</mat-icon>
                        <span class="filename">{{cnicFront.name}}</span>
                      </div>
                    </div>
                    <div class="upload-item" (click)="backFileInput.click()">
                      <input type="file" #backFileInput hidden (change)="onFileSelected($event, 'back')" accept=".pdf,.jpeg,.jpg,.png">
                      <div class="upload-placeholder" *ngIf="!cnicBack">
                        <mat-icon>branding_watermark</mat-icon>
                        <span class="label">Upload CNIC Back</span>
                      </div>
                      <div class="preview-container" *ngIf="cnicBack">
                        <mat-icon>{{isFileImage(cnicBack) ? 'image' : 'picture_as_pdf'}}</mat-icon>
                        <span class="filename">{{cnicBack.name}}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="step-actions">
                  <button mat-flat-button type="button" class="next-btn" (click)="onProfileNext(stepper)" [disabled]="checkingCnic()">
                    <ng-container *ngIf="!checkingCnic(); else cnicCheckSpinner">Next Step <mat-icon>arrow_forward</mat-icon></ng-container>
                    <ng-template #cnicCheckSpinner><mat-spinner diameter="22"></mat-spinner></ng-template>
                  </button>
                </div>
              </form>
            </mat-step>

            <mat-step [stepControl]="locationForm">
              <ng-template matStepLabel>Location</ng-template>
              <form [formGroup]="locationForm" class="step-content">
                <div class="form-grid">
                  <mat-form-field appearance="outline">
                    <mat-label>Region</mat-label>
                    <mat-select formControlName="regionId" (selectionChange)="onRegionChange($event.value)">
                      <mat-option *ngFor="let r of regions" [value]="r.id">{{r.name}}</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Division</mat-label>
                    <mat-select formControlName="divisionId" (selectionChange)="onDivisionChange($event.value)">
                      <mat-option *ngFor="let d of divisions" [value]="d.id">{{d.name}}</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>District</mat-label>
                    <mat-select formControlName="districtId" (selectionChange)="onDistrictChange($event.value)">
                      <mat-option *ngFor="let dist of districts" [value]="dist.id">{{dist.name}}</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Tehsil</mat-label>
                    <mat-select formControlName="markazId">
                      <mat-option *ngFor="let t of tehsils" [value]="t.id">{{t.name}}</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Address</mat-label>
                    <input matInput formControlName="address" placeholder="Enter full mailing address">
                    <mat-icon matPrefix>home</mat-icon>
                  </mat-form-field>
                </div>
                <div class="step-actions">
                  <button mat-button matStepperPrevious>Back</button>
                  <button mat-flat-button class="next-btn" matStepperNext>Next Step <mat-icon>arrow_forward</mat-icon></button>
                </div>
              </form>
            </mat-step>

            <mat-step [stepControl]="implementForm">
              <ng-template matStepLabel>Implements</ng-template>
              <form [formGroup]="implementForm" class="step-content">
                <div class="implement-selection-grid">
                  <div *ngFor="let imp of implements" 
                       class="premium-imp-card" 
                       [class.is-selected]="implementForm.get('implementId')?.value === imp.id" 
                       (click)="selectImplement(imp.id!)">
                    
                    <div class="card-glow-layer"></div>
                    
                    <!-- Top Section: Icon & Badge -->
                    <div class="card-header-v2">
                      <div class="icon-orb">
                        <mat-icon>agriculture</mat-icon>
                      </div>
                      <div class="subsidy-badge">
                        <span class="year-label">SUBSIDY YEAR</span>
                        <span class="year-val">{{imp.subsidyYear}}</span>
                      </div>
                    </div>

                    <!-- Middle Section: Main Title -->
                    <div class="naming-section">
                      <h3>{{imp.name}}</h3>
                      <p>Industrial Grade Agriquipment</p>
                    </div>

                    <!-- Bottom Section: Pricing Matrix -->
                    <div class="pricing-matrix">
                      <div class="price-row">
                        <span class="label">Farmer Portion</span>
                        <span class="value farmer">Rs. {{imp.farmerShare | number}}</span>
                      </div>
                      <div class="price-row">
                        <span class="label">Govt. Contribution</span>
                        <span class="value govt">Rs. {{imp.governmentShare | number}}</span>
                      </div>
                      <div class="total-divider"></div>
                      <div class="price-row total">
                        <span class="label">Total Acquisition Price</span>
                        <span class="value-total">Rs. {{imp.totalCostPrice | number}}</span>
                      </div>
                    </div>

                    <!-- Selection Indicator -->
                    <div class="selection-check">
                      <mat-icon>check_circle</mat-icon>
                    </div>
                  </div>
                </div>
                <div class="step-actions">
                  <button mat-button matStepperPrevious>Back</button>
                  <button mat-flat-button class="next-btn" matStepperNext>Next Step <mat-icon>arrow_forward</mat-icon></button>
                </div>
              </form>
            </mat-step>

            <mat-step [stepControl]="technicalForm">
              <ng-template matStepLabel>Technical</ng-template>
              <form [formGroup]="technicalForm" class="step-content">
                <div class="section-header"><mat-icon>landscape</mat-icon> Land Information</div>
                <div class="form-grid">
                  <mat-form-field appearance="outline" class="land-input-field">
                    <mat-label>Total Land Area</mat-label>
                    <input matInput type="number" formControlName="totalLandArea" placeholder="e.g. 12.5">
                    <mat-icon matPrefix>landscape</mat-icon>
                  </mat-form-field>
                  
                  <div class="toggle-container">
                    <mat-button-toggle-group formControlName="landUnit" aria-label="Land Unit">
                      <mat-button-toggle value="ACRES">Acres</mat-button-toggle>
                      <mat-button-toggle value="KANALS">Kanals</mat-button-toggle>
                    </mat-button-toggle-group>
                  </div>
                </div>
                <div class="section-header" style="margin-top: 24px;"><mat-icon>agriculture</mat-icon> Tractor Information</div>
                <div class="form-grid">
                  <mat-form-field appearance="outline">
                    <mat-label>Horse Power (HP)</mat-label>
                    <input matInput formControlName="tractorHP">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Model / Year</mat-label>
                    <input matInput formControlName="tractorModel">
                  </mat-form-field>
                </div>
                <div class="step-actions">
                  <button mat-button matStepperPrevious>Back</button>
                  <button mat-flat-button class="next-btn" matStepperNext>Next Step <mat-icon>arrow_forward</mat-icon></button>
                </div>
              </form>
            </mat-step>

            <mat-step [stepControl]="eligibilityForm">
              <ng-template matStepLabel>Eligibility</ng-template>
              <form [formGroup]="eligibilityForm" class="step-content">
                <div class="eligibility-list">
                  <div class="criteria-item" *ngFor="let criteria of criteriaList; let i = index" [formArrayName]="'checks'">
                    <mat-checkbox [formControlName]="i">
                      <div class="criteria-text"><h5>{{criteria.label}}</h5><p>{{criteria.description}}</p></div>
                    </mat-checkbox>
                  </div>
                </div>
                <div class="step-actions">
                  <button mat-button matStepperPrevious>Back</button>
                  <button mat-flat-button class="next-btn" matStepperNext>Next Step <mat-icon>arrow_forward</mat-icon></button>
                </div>
              </form>
            </mat-step>

            <mat-step>
              <ng-template matStepLabel>Review & Decision</ng-template>
              <div class="step-content">
                <div class="premium-review-card">
                  <h3><mat-icon>task_alt</mat-icon> Application Final Summary</h3>
                  
                  <div class="summary-section">
                    <div class="section-badge">PROFILE</div>
                    <div class="summary-grid">
                      <div class="summ-item"><span>Farmer Name</span><strong>{{farmerForm.get('farmerName')?.value}}</strong></div>
                      <div class="summ-item"><span>Father Name</span><strong>{{farmerForm.get('fatherName')?.value}}</strong></div>
                      <div class="summ-item"><span>CNIC</span><strong>{{getCnicString()}}</strong></div>
                      <div class="summ-item"><span>Contact</span><strong>{{farmerForm.get('contactNumber')?.value}}</strong></div>
                    </div>
                  </div>

                  <div class="summary-section">
                    <div class="section-badge">LOCATION</div>
                    <div class="summary-grid">
                      <div class="summ-item"><span>Region</span><strong>{{getSelectedRegion()}}</strong></div>
                      <div class="summ-item"><span>Division</span><strong>{{getSelectedDivision()}}</strong></div>
                      <div class="summ-item"><span>District</span><strong>{{getSelectedDistrict()}}</strong></div>
                      <div class="summ-item"><span>Tehsil</span><strong>{{getSelectedTehsil()}}</strong></div>
                      <div class="summ-item"><span>Address</span><strong>{{locationForm.get('address')?.value}}</strong></div>
                    </div>
                  </div>

                  <div class="summary-section">
                    <div class="section-badge">EQUIPMENT & LAND</div>
                    <div class="summary-grid">
                      <div class="summ-item"><span>Selected Equipment</span><strong>{{getSelectedImplementName()}}</strong></div>
                      <div class="summ-item"><span>Total Land Area</span><strong>{{technicalForm.get('totalLandArea')?.value}} {{technicalForm.get('landUnit')?.value | titlecase}}</strong></div>
                      <div class="summ-item"><span>Tractor HP</span><strong>{{technicalForm.get('tractorHP')?.value}} HP</strong></div>
                      <div class="summ-item"><span>Tractor Model</span><strong>{{technicalForm.get('tractorModel')?.value}}</strong></div>
                    </div>
                  </div>
                </div>

                <div class="decision-section">
                  <h4>Final Processing Assessment</h4>
                  <mat-radio-group [(ngModel)]="finalDecision" class="decision-group">
                    <mat-radio-button value="ACCEPTED" class="acc">Approved</mat-radio-button>
                    <mat-radio-button value="NOT_ELIGIBLE" class="rej">Ineligible</mat-radio-button>
                  </mat-radio-group>
                </div>

                <div class="step-actions">
                  <button mat-button matStepperPrevious>Back to Criteria</button>
                  <button mat-flat-button class="submit-btn" (click)="onSubmitAll()">Finalize & Submit</button>
                </div>
              </div>
            </mat-step>
          </mat-stepper>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .page-wrapper { background: #f0f2f5; min-height: 100vh; padding: 40px 20px; }
    .register-container { max-width: 1100px; margin: 0 auto; position: relative; }
    
    .header {
      display: flex; align-items: center; gap: 20px; margin-bottom: 30px;
      .back-btn { background: white; box-shadow: 0 4px 10px rgba(0,0,0,0.05); color: #64748b; }
      h1 { margin: 0; font-size: 26px; font-weight: 800; color: #1e293b; }
      p { margin: 2px 0 0; color: #10b981; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; font-size: 11px; }
    }

    .stepper-card {
      border-radius: 24px; border: none; overflow: hidden;
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.04);
      background: #fdfbf7 !important; /* Premium Beige/Off-white background */
    }

    ::ng-deep .premium-stepper {
      background: transparent !important;
      
      .mat-horizontal-stepper-header-container { 
        padding: 32px 12px; /* Reduced from 40px to move Step 1 left and Step 6 right */
        border-bottom: 1px solid rgba(0,0,0,0.05); 
        background: #fdfbf7 !important; /* Beige background to match card */
        display: flex;
        align-items: center;
      }
      
      .mat-step-header { 
        padding: 0 12px !important; /* Tightened padding for connected look */
        overflow: visible !important;
        flex: 0 0 auto !important;
        min-width: unset !important;
      }
      
      .mat-step-label { 
        font-size: 13px; 
        font-weight: 800; 
        color: #94a3b8; 
        overflow: visible !important;
        text-overflow: unset !important;
        white-space: nowrap !important;
        margin-right: 8px;
      }
      
      .mat-step-label-selected { color: #10b981 !important; }
      
      .mat-step-icon { width: 40px; height: 40px; background-color: #f1f5f9 !important; color: #cbd5e1 !important; font-size: 20px; }
      .mat-step-icon-selected, .mat-step-icon-active { background-color: #f0fdf4 !important; color: #10b981 !important; transform: scale(1.1); box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2); }
      .mat-step-icon-state-done, .mat-step-icon-state-edit { background-color: #10b981 !important; color: white !important; }
      
      .mat-stepper-horizontal-line { 
        border-top: 2.5px solid #94a3b8 !important; /* Slightly thicker, more defined line */
        margin: 0 -16px !important; /* Negative margin to bridge gaps between headers */
        opacity: 0.3 !important; /* Increased opacity (~30%) as requested */
        flex: 1 1 auto !important;
      }
    }

    .step-content { padding: 48px; background: #fdfbf7; } /* Consistent Beige Match */
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: center; }
    .full-width { grid-column: span 2; }
    .section-header { font-size: 16px; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 10px; margin-bottom: 20px; mat-icon { color: #10b981; } }

    .toggle-container {
      display: flex;
      height: 56px;
      align-items: center;
      margin-top: -18px; /* Alignment with mat-form-field outline */
    }
    
    ::ng-deep .mat-button-toggle-group {
      border: 2px solid #e2e8f0 !important;
      border-radius: 12px !important;
      background: #ffffff !important;
      overflow: hidden;
      height: 48px;
    }
    
    ::ng-deep .mat-button-toggle {
      border-left: 2px solid #e2e8f0 !important;
      &:first-child { border-left: none !important; }
      .mat-button-toggle-label-content { font-weight: 800; color: #64748b; font-size: 13px; padding: 0 20px; }
      &.mat-button-toggle-checked {
        background-color: #f0fdf4 !important;
        .mat-button-toggle-label-content { color: #10b981; }
      }
    }

    .section-label { font-size: 13px; font-weight: 800; color: #475569; margin-bottom: 12px; display: block; }
    .cnic-input-group { display: flex; align-items: center; gap: 12px; margin-bottom: 30px; }
    .cnic-segment { display: flex; gap: 6px; }
    .cnic-box {
      width: 40px; height: 52px; text-align: center; font-size: 18px; font-weight: 800;
      border: 2px solid #e2e8f0; border-radius: 12px; background: #f8fafc; transition: all 0.2s;
      &:focus { border-color: #10b981; background: white; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1); outline: none; }
    }
    .hyphen { font-weight: 900; color: #cbd5e1; font-size: 24px; }

    .upload-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .upload-item {
      height: 110px; border: 2px dashed #e2e8f0; border-radius: 20px; 
      display: flex; align-items: center; justify-content: center; cursor: pointer;
      background: #f8fafc; transition: all 0.2s;
      &:hover { background: #f0fdf4; border-color: #10b981; }
      .upload-placeholder { display: flex; flex-direction: column; align-items: center; color: #64748b; mat-icon { font-size: 28px; width: 28px; height: 28px; } .label { font-size: 12px; font-weight: 800; margin-top: 6px; } }
      .preview-container { display: flex; align-items: center; gap: 10px; color: #10b981; font-weight: 800; font-size: 13px; }
    }

    /* --- Premium Implement Card V2 --- */
    .implement-selection-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 30px; }
    .premium-imp-card {
      position: relative;
      background: #ffffff;
      border-radius: 28px;
      padding: 30px;
      border: 1px solid #e2e8f0;
      cursor: pointer;
      overflow: hidden;
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.02), 0 8px 10px -6px rgba(0,0,0,0.02);
      &:hover { transform: translateY(-8px); box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.08); border-color: #10b98150; }
      &.is-selected {
        border-color: #10b981; background: #f0fdf4; 
        box-shadow: 0 0 0 2px #10b981, 0 25px 50px -12px rgba(16, 185, 129, 0.15);
        .icon-orb { background: #10b981; color: white; transform: rotate(15deg); }
        .selection-check { opacity: 1; transform: scale(1); }
        .pricing-matrix { background: white; border-color: transparent; }
      }
    }

    .card-header-v2 { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .icon-orb {
      width: 56px; height: 56px; background: #f1f5f9; color: #64748b; border-radius: 18px;
      display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;
      mat-icon { font-size: 28px; width: 28px; height: 28px; }
    }

    .subsidy-badge {
      text-align: right;
      .year-label { display: block; font-size: 9px; font-weight: 900; color: #94a3b8; letter-spacing: 1px; }
      .year-val { font-size: 14px; font-weight: 800; color: #1e293b; }
    }

    .naming-section {
      margin-bottom: 28px;
      h3 { font-size: 20px; font-weight: 900; color: #0f172a; margin: 0; }
      p { font-size: 11px; font-weight: 600; color: #10b981; text-transform: uppercase; margin: 4px 0 0; letter-spacing: 0.5px; }
    }

    .pricing-matrix { background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 20px; padding: 20px; transition: all 0.3s ease; }
    .price-row {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
      .label { font-size: 11px; font-weight: 700; color: #64748b; }
      .value { font-size: 14px; font-weight: 800; }
      .value.farmer { color: #1e293b; }
      .value.govt { color: #64748b; font-weight: 700; }
      &.total {
        margin-top: 12px; margin-bottom: 0;
        .label { color: #0f172a; font-weight: 800; font-size: 12px; }
        .value-total { font-size: 18px; font-weight: 900; color: #10b981; }
      }
    }
    .total-divider { height: 1px; background: #e2e8f0; margin: 4px 0; }
    .selection-check {
      position: absolute; top: -12px; right: -12px; color: #10b981; background: white; border-radius: 50%;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1); opacity: 0; transform: scale(0.5);
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      mat-icon { font-size: 32px; width: 32px; height: 32px; }
    }

    /* --- Eligibility & Review Polish --- */
    .eligibility-list { display: flex; flex-direction: column; gap: 20px; }
    .criteria-item {
      padding: 24px; background: white; border: 1px solid #e2e8f0; border-radius: 24px;
      transition: all 0.3s ease;
      &:hover { border-color: #10b981; box-shadow: 0 10px 20px rgba(0,0,0,0.02); }
      ::ng-deep .mdc-form-field { width: 100%; align-items: flex-start; }
      .criteria-text { margin-left: 12px; h5 { margin: 0; font-size: 16px; font-weight: 800; color: #1e293b; } p { margin: 4px 0 0; font-size: 13px; color: #64748b; font-weight: 500; } }
    }

    .premium-review-card {
      background: white; border-radius: 28px; padding: 40px; border: 1px solid #e2e8f0; margin-bottom: 40px;
      h3 { font-size: 20px; font-weight: 900; color: #1e293b; margin: 0 0 32px; display: flex; align-items: center; gap: 12px;
           &::before { content: ''; width: 6px; height: 24px; background: #10b981; border-radius: 4px; } }
    }
    
    .summary-section { 
      margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px dashed #e2e8f0;
      &:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
    }
    .section-badge { 
      display: inline-block; font-size: 10px; font-weight: 900; background: #f0fdf4; color: #10b981; 
      padding: 4px 12px; border-radius: 8px; margin-bottom: 16px; letter-spacing: 1px;
    }
    
    .summary-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;
      .summ-item {
        display: flex; flex-direction: column; gap: 4px;
        span { font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
        strong { font-size: 14px; color: #1e293b; font-weight: 700; }
      }
    }
    
    .decision-section { h4 { font-size: 16px; font-weight: 800; color: #1e293b; margin-bottom: 20px; } }
    .decision-group { display: flex; gap: 30px; }
    .acc { ::ng-deep .mdc-form-field { color: #10b981; font-weight: 800; font-size: 15px; } }
    .rej { ::ng-deep .mdc-form-field { color: #ef4444; font-weight: 800; font-size: 15px; } }

    .step-actions { display: flex; justify-content: flex-end; gap: 16px; margin-top: 48px; border-top: 1px solid #e2e8f0; padding-top: 32px; }
    .next-btn { background: #10b981 !important; color: white !important; font-weight: 800; border-radius: 16px; padding: 0 36px; height: 54px; letter-spacing: 0.5px; }
    .next-btn mat-spinner { display: inline-block; vertical-align: middle; }
    .submit-btn { background: #1e293b !important; color: white !important; font-weight: 800; border-radius: 16px; padding: 0 54px; height: 56px; font-size: 15px; }

    .loader-overlay {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 5000;
      background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      .loader-container { display: flex; flex-direction: column; align-items: center; gap: 20px; text-align: center; }
      h3 { font-size: 20px; font-weight: 900; color: #1e293b; margin: 0; }
      p { color: #64748b; font-size: 15px; font-weight: 500; margin: 0; }
    }

    ::ng-deep .mat-mdc-progress-spinner circle { stroke: #10b981 !important; }

    .success-snackbar {
      --mdc-snackbar-container-color: #10b981;
      --mdc-snackbar-label-text-color: white;
      --mat-snack-bar-button-color: white;
    }
  `]
})
export class RegisterFarmerApplicationComponent implements OnInit {
  private fb = inject(FormBuilder);
  private regionService = inject(RegionService);
  private divisionService = inject(DivisionService);
  private districtService = inject(DistrictService);
  private markazService = inject(MarkazService);
  private implementService = inject(ImplementService);

  farmerForm: FormGroup;
  locationForm: FormGroup;
  implementForm: FormGroup;
  technicalForm: FormGroup;
  eligibilityForm: FormGroup;

  regions: any[] = [];
  divisions: any[] = [];
  districts: any[] = [];
  tehsils: any[] = [];
  implements: Implement[] = [];

  cnicFront: File | null = null;
  cnicBack: File | null = null;
  finalDecision: string = 'ACCEPTED';
  isLocationLoading = signal(false);
  checkingCnic = signal(false);
  loaderTitle = signal('Fetching Data');
  loaderDesc = signal('Please wait while we sync with the server...');

  criteriaList = [
    { label: 'Owning Tractor', description: 'Farmer must own a functional tractor for matching implements.' },
    { label: 'Land Ownership', description: 'At least 5 acres of agricultural land in Punjab.' },
    { label: 'Non-Defaulter', description: 'Must not be a defaulter of any bank or government scheme.' },
    { label: 'Resident Status', description: 'Valid resident of the selected Tehsil/District.' }
  ];

  constructor() {
    this.farmerForm = this.fb.group({
      farmerName: ['', Validators.required],
      fatherName: ['', Validators.required],
      contactNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10,12}$/)]],
      cnic: this.fb.array([this.createCnicSegment(5), this.createCnicSegment(7), this.createCnicSegment(1)])
    });

    this.locationForm = this.fb.group({
      regionId: ['', Validators.required],
      divisionId: ['', Validators.required],
      districtId: ['', Validators.required],
      markazId: [''],
      address: ['', Validators.required]
    });

    this.implementForm = this.fb.group({
      implementId: ['', Validators.required]
    });

    this.technicalForm = this.fb.group({
      totalLandArea: ['', [Validators.required, Validators.min(0)]],
      landUnit: ['ACRES', Validators.required],
      tractorHP: ['', Validators.required],
      tractorModel: ['', Validators.required]
    });

    this.eligibilityForm = this.fb.group({
      checks: this.fb.array(this.criteriaList.map(() => new FormControl(false)))
    });
  }

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.loaderTitle.set('Booting Registry');
    this.loaderDesc.set('Loading location maps and equipment inventory...');
    this.isLocationLoading.set(true);
    forkJoin({
      regions: this.regionService.getRegions(),
      implements: this.implementService.getAll()
    }).pipe(finalize(() => this.isLocationLoading.set(false)))
      .subscribe({
        next: (res) => {
          this.regions = res.regions;
          this.implements = res.implements;
        }
      });
  }

  onRegionChange(regionId: number) {
    this.locationForm.patchValue({ divisionId: '', districtId: '' });
    this.loaderTitle.set('Updating Geography');
    this.loaderDesc.set('Fetching administrative divisions for selected region...');
    this.isLocationLoading.set(true);
    this.divisionService.getDivisionsByRegion(regionId)
      .pipe(finalize(() => this.isLocationLoading.set(false)))
      .subscribe(data => this.divisions = data);
  }

  onDivisionChange(divisionId: number) {
    this.locationForm.patchValue({ districtId: '' });
    this.isLocationLoading.set(true);
    this.districtService.getDistrictsByDivision(divisionId)
      .pipe(finalize(() => this.isLocationLoading.set(false)))
      .subscribe(data => this.districts = data);
  }

  onDistrictChange(districtId: number) {
    this.locationForm.patchValue({ markazId: '' });
    this.tehsils = [];
    this.markazService.getMarkazByDistrict(districtId)
      .subscribe(data => this.tehsils = data);
  }

  selectImplement(id: number) { this.implementForm.get('implementId')?.setValue(id); }

  createCnicSegment(length: number) {
    return new FormArray(Array.from({ length }, () => new FormControl('', [Validators.required, Validators.pattern(/^[0-9]$/)])));
  }

  getCnicControl(segment: number, index: number) {
    return (this.farmerForm.get('cnic') as FormArray).at(segment).get(index.toString()) as FormControl;
  }

  onCnicKeyUp(event: any, seg: number, idx: number) {
    const val = event.target.value;
    if (event.key === 'Backspace' && !val) {
      if (idx > 0) document.getElementById(`cnic-${seg}-${idx - 1}`)?.focus();
      else if (seg > 0) document.getElementById(`cnic-${seg - 1}-${(seg === 1 ? 5 : 7) - 1}`)?.focus();
    } else if (/^[0-9]$/.test(val)) {
      const segLen = seg === 0 ? 5 : seg === 1 ? 7 : 1;
      if (idx < segLen - 1) document.getElementById(`cnic-${seg}-${idx + 1}`)?.focus();
      else if (seg < 2) document.getElementById(`cnic-${seg + 1}-0`)?.focus();
    }
  }

  onFileSelected(event: any, type: string) {
    const file = event.target.files[0];
    if (type === 'front') this.cnicFront = file; else this.cnicBack = file;
  }

  isFileImage(file: File) { return file.type.startsWith('image/'); }

  getCnicString() {
    const cnic = this.farmerForm.value.cnic;
    if (!cnic || !cnic[0]) return 'N/A';
    return `${cnic[0].join('')}-${cnic[1].join('')}-${cnic[2].join('')}`;
  }

  onProfileNext(stepper: MatStepper) {
    if (!this.farmerForm.valid) {
      this.farmerForm.markAllAsTouched();
      this.snackBar.open('Please complete all profile fields.', 'Close', {
        duration: 4000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      return;
    }
    const cnic = this.getCnicString();
    if (cnic.replace(/\D/g, '').length !== 13) {
      this.snackBar.open('Enter a valid 13-digit CNIC.', 'Close', {
        duration: 4000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      return;
    }
    this.checkingCnic.set(true);
    this.applicationService.checkCnicExists(cnic).pipe(
      finalize(() => this.checkingCnic.set(false))
    ).subscribe({
      next: (res) => {
        if (res.exists) {
          this.snackBar.open(
            'This CNIC is already registered. You cannot continue with a duplicate CNIC.',
            'Close',
            { duration: 7000, horizontalPosition: 'right', verticalPosition: 'top' }
          );
          return;
        }
        stepper.next();
      },
      error: () => {
        this.snackBar.open('Could not verify CNIC. Please try again.', 'Close', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      }
    });
  }

  getSelectedImplementName() {
    return this.implements.find(i => i.id === this.implementForm.value.implementId)?.name || 'None';
  }

  getSelectedLocation() {
    return 'N/A';
  }

  getSelectedRegion() {
    return this.regions.find(r => r.id === this.locationForm.value.regionId)?.name || 'N/A';
  }

  getSelectedDivision() {
    return this.divisions.find(d => d.id === this.locationForm.value.divisionId)?.name || 'N/A';
  }

  getSelectedDistrict() {
    return this.districts.find(d => d.id === this.locationForm.value.districtId)?.name || 'N/A';
  }

  getSelectedTehsil() {
    return this.tehsils.find(t => t.id === this.locationForm.value.markazId)?.name || 'N/A';
  }

  private applicationService = inject(FarmerApplicationService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  onSubmitAll() {
    this.loaderTitle.set('Uploading Documents');
    this.loaderDesc.set('Uploading CNIC documents to secure storage...');
    this.isLocationLoading.set(true);

    const farmerData = this.farmerForm.value;
    const locationData = this.locationForm.value;
    const technicalData = this.technicalForm.value;
    const implementId = this.implementForm.get('implementId')?.value;

    const uploadFront$ = this.cnicFront ? this.applicationService.uploadFile(this.cnicFront) : of(null);
    const uploadBack$ = this.cnicBack ? this.applicationService.uploadFile(this.cnicBack) : of(null);

    forkJoin({ front: uploadFront$, back: uploadBack$ }).pipe(
      switchMap(uploaded => {
        this.loaderTitle.set('Registering Application');
        this.loaderDesc.set('Securely saving data to central registry...');

        const payload: any = {
          farmerName: farmerData.farmerName,
          fatherName: farmerData.fatherName,
          contactNumber: farmerData.contactNumber,
          address: locationData.address,
          cnic: this.getCnicString(),
          regionId: locationData.regionId,
          divisionId: locationData.divisionId,
          districtId: locationData.districtId,
          markazId: locationData.markazId || null,
          implementId: implementId,
          yearOfApplication: '2024-25',
          projectTypeId: localStorage.getItem('selectedProjectTypeId') ? Number(localStorage.getItem('selectedProjectTypeId')) : null,
          landArea: technicalData.totalLandArea,
          landUnit: technicalData.landUnit,
          tractorHP: technicalData.tractorHP,
          tractorModel: technicalData.tractorModel,
          status: this.finalDecision,
          farmerCnicFront: uploaded.front?.fileName || null,
          farmerCnicBack: uploaded.back?.fileName || null
        };

        return this.applicationService.register(payload);
      }),
      finalize(() => this.isLocationLoading.set(false))
    ).subscribe({
      next: (res: any) => {
        this.snackBar.open(`Application Registered! ID: ${res.applicationNumber}`, 'Close', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
        this.router.navigate(['/portal/applications']);
      },
      error: (err) => {
        this.snackBar.open('Registration Failed. Please verify input data.', 'Retry', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      }
    });
  }

  goBack() {
    window.history.back();
  }
}
