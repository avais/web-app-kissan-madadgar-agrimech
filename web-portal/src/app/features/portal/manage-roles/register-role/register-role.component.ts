import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { RoleService, Role, Feature } from '../../../../core/services/role.service';
import { FeatureService } from '../../../../core/services/feature.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-register-role',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatTooltipModule
  ],
  animations: [
    trigger('expandCollapse', [
      state('collapsed', style({ height: '0px', minHeight: '0', opacity: 0, visibility: 'hidden' })),
      state('expanded', style({ height: '*', opacity: 1, visibility: 'visible' })),
      transition('expanded <=> collapsed', animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
  template: `
    <div class="register-role-page">
      <div class="loader-overlay" *ngIf="isSaving() || isLoading()">
        <div class="loader-container">
          <mat-spinner diameter="50" strokeWidth="5"></mat-spinner>
          <div class="loader-text">
            <h3>{{ isSaving() ? 'Securing Role' : 'Loading Features' }}</h3>
            <p>{{ isSaving() ? 'Updating system governance protocols...' : 'Retriving capabilities...' }}</p>
          </div>
        </div>
      </div>

      <div class="header">
        <div class="header-left">
          <button mat-icon-button (click)="goBack()" class="back-btn">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="title-section">
            <div class="governance-badge">GOVERNANCE ENGINE</div>
            <h1>{{ isEditMode() ? 'Edit Role' : 'Create New Role' }}</h1>
            <p>Define administrative permissions and access hierarchy.</p>
          </div>
        </div>
        <div class="header-actions">
           <div class="global-toggle">
            <span class="label">System-Wide Access</span>
            <mat-checkbox 
              color="primary"
              [checked]="isAllSelected()"
              [indeterminate]="isAnySelected() && !isAllSelected()"
              (change)="toggleAll()">
            </mat-checkbox>
           </div>
        </div>
      </div>

      <div class="content-grid">
        <!-- Basic Info Section -->
        <mat-card class="form-card glass-panel">
          <form [formGroup]="roleForm" class="role-form">
            <div class="form-row">
              <mat-form-field appearance="outline" class="flex-2">
                <mat-label>Role Specification</mat-label>
                <input matInput formControlName="name" placeholder="e.g. Master Administrator">
                <mat-icon matPrefix>verified_user</mat-icon>
                <mat-hint>Choose a unique name for this security profile</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Authority Level</mat-label>
                <mat-select formControlName="level">
                  <mat-option *ngFor="let level of roleLevels" [value]="level">
                    {{level}}
                  </mat-option>
                </mat-select>
                <mat-icon matPrefix>leaderboard</mat-icon>
              </mat-form-field>
            </div>
          </form>
        </mat-card>

        <!-- Permissions Hierarchy Section -->
        <div class="permissions-container">
          <div class="section-meta">
            <div class="meta-info">
              <h3>Granular Access Control</h3>
              <p>Configure access points across modules. Permissions are inherited by default.</p>
            </div>
            <div class="selection-counter" *ngIf="selectedFeatures().length > 0">
              <span class="count">{{selectedFeatures().length}}</span> 
              <span class="text">Permissions Active</span>
            </div>
          </div>

          <div class="features-tree-grid" *ngIf="groupedFeatures().length > 0; else noFeatures">
            <div *ngFor="let parent of groupedFeatures()" class="feature-branch">
              <mat-card class="branch-card">
                <div class="branch-header" [class.selected]="isFeatureSelected(parent)">
                  <div class="feature-info">
                    <mat-checkbox 
                      color="primary"
                      [matTooltip]="parent.description || 'Access to this module'"
                      [checked]="isFeatureSelected(parent)"
                      [indeterminate]="isFeatureIndeterminate(parent)"
                      (change)="toggleFeatureDeep(parent)">
                      <div class="header-content">
                        <div class="icon-wrap">
                           <mat-icon>{{ parent.icon || 'settings_input_component' }}</mat-icon>
                        </div>
                        <div class="text-wrap">
                          <span class="name">{{ parent.name }}</span>
                          <span class="desc">{{ parent.description || 'Access to ' + parent.name + ' sub-modules.' }}</span>
                        </div>
                      </div>
                    </mat-checkbox>
                  </div>
                  <button mat-icon-button (click)="toggleExpand(parent.id)" *ngIf="parent.subFeatures?.length">
                    <mat-icon class="expand-icon" [class.rotate]="isExpanded(parent.id)">expand_more</mat-icon>
                  </button>
                </div>
                
                <div class="branch-body" *ngIf="isExpanded(parent.id) && parent.subFeatures?.length" [@expandCollapse]="isExpanded(parent.id) ? 'expanded' : 'collapsed'">
                   <div class="nested-level">
                      <ng-container *ngTemplateOutlet="featureNode; context: { $implicit: parent.subFeatures, level: 1 }"></ng-container>
                   </div>
                </div>
              </mat-card>
            </div>
          </div>

          <!-- Recursive Template -->
          <ng-template #featureNode let-nodes let-level="level">
            <div class="node-list">
              <div *ngFor="let node of nodes" class="node-item">
                <div class="node-label-wrap">
                  <mat-checkbox 
                    color="primary"
                    [matTooltip]="node.description || 'Permission for ' + node.name"
                    [checked]="isFeatureSelected(node)"
                    [indeterminate]="isFeatureIndeterminate(node)"
                    (change)="toggleFeatureDeep(node)">
                    <div class="node-meta">
                      <span class="node-name">{{ node.name }}</span>
                      <span class="node-route" *ngIf="node.route">{{ node.route }}</span>
                    </div>
                  </mat-checkbox>
                </div>
                <div class="sub-nodes" *ngIf="node.subFeatures?.length">
                   <ng-container *ngTemplateOutlet="featureNode; context: { $implicit: node.subFeatures, level: level + 1 }"></ng-container>
                </div>
              </div>
            </div>
          </ng-template>

          <ng-template #noFeatures>
            <div class="empty-state">
              <div class="empty-icon-wrap">
                <mat-icon>security_update_warning</mat-icon>
              </div>
              <h3>Infrastructure Sync Required</h3>
              <p>The security manifest is empty. Please refresh to load capabilities.</p>
              <button mat-flat-button color="primary" (click)="loadData()">
                <mat-icon>sync</mat-icon> Synchronize Manifest
              </button>
            </div>
          </ng-template>
        </div>

        <!-- Sticky Footer Actions -->
        <div class="sticky-footer">
          <div class="footer-wrap">
            <div class="security-status" *ngIf="roleForm.valid">
              <mat-icon class="verified">verified</mat-icon>
              <span>Manifest Validated</span>
            </div>
            <div class="button-group">
              <button mat-button (click)="goBack()" class="cancel-btn">Discard Changes</button>
              <button mat-flat-button color="primary" 
                class="save-btn"
                [disabled]="roleForm.invalid || isSaving()" 
                (click)="save()">
                <mat-icon>{{ isEditMode() ? 'system_update_alt' : 'security' }}</mat-icon>
                {{ isEditMode() ? 'Synchronize Role' : 'Initialize Profile' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .register-role-page { padding: 40px; background: #f8fafc; min-height: 100vh; position: relative; }
    
    .governance-badge { font-size: 10px; font-weight: 800; color: #3b82f6; letter-spacing: 2px; margin-bottom: 8px; }
    .header {
      display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 48px;
      .header-left { display: flex; gap: 24px; align-items: flex-start; }
      .back-btn { background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border-radius: 12px; }
      h1 { font-size: 32px; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -1px; }
      p { font-size: 15px; color: #64748b; margin: 4px 0 0; }
    }

    .global-toggle {
      background: #fff; padding: 12px 24px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.04);
      display: flex; align-items: center; gap: 16px; border: 1px solid #f1f5f9;
      .label { font-size: 14px; font-weight: 700; color: #1e293b; }
    }

    .content-grid { display: flex; flex-direction: column; gap: 32px; max-width: 1000px; margin: 0 auto; }

    .glass-panel {
      background: rgba(255, 255, 255, 0.9) !important; backdrop-filter: blur(12px);
      border: 1px solid #f1f5f9 !important; border-radius: 20px !important;
    }

    .form-card {
      padding: 24px;
      .role-form {
        .form-row { display: flex; gap: 24px; }
        .flex-2 { flex: 2; }
        .flex-1 { flex: 1; }
      }
    }

    .permissions-container {
      margin-bottom: 150px;
      .section-meta {
        display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;
        h3 { font-size: 20px; font-weight: 800; color: #1e293b; margin: 0; }
        p { color: #64748b; font-size: 13px; margin: 4px 0 0; }
        .selection-counter {
          background: #3b82f610; padding: 6px 12px; border-radius: 10px;
          display: flex; align-items: center; gap: 8px;
          .count { font-weight: 900; color: #3b82f6; font-size: 16px; }
          .text { font-size: 11px; font-weight: 700; color: #3b82f6; text-transform: uppercase; }
        }
      }
    }

    .features-tree-grid { display: flex; flex-direction: column; gap: 16px; }
    .branch-card {
      border-radius: 20px !important; border: 1px solid #f1f5f9 !important; overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.02) !important;
      .branch-header {
        padding: 20px 24px; display: flex; justify-content: space-between; align-items: center;
        background: #fff; transition: background 0.2s;
        &.selected { background: #f8fafc; }
        .feature-info {
          flex: 1;
          .header-content {
            display: flex; align-items: center; gap: 16px;
            .icon-wrap {
              width: 44px; height: 44px; border-radius: 12px; background: #eff6ff;
              display: flex; align-items: center; justify-content: center;
              mat-icon { color: #3b82f6; font-size: 22px; width: 22px; height: 22px; }
            }
            .text-wrap {
              display: flex; flex-direction: column;
              .name { font-size: 16px; font-weight: 800; color: #1e293b; }
              .desc { font-size: 11px; color: #94a3b8; font-weight: 500; }
            }
          }
        }
      }
      .branch-body { 
        padding: 0 24px 24px; background: #fff; 
        .nested-level { border-left: 2px solid #f1f5f9; margin-left: 42px; padding-left: 12px; }
      }
    }

    .node-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .node-item {
      padding: 12px 16px; background: #fff; border: 1px solid #f1f5f9; border-radius: 12px;
      transition: all 0.2s; position: relative;
      &:hover { border-color: #3b82f640; background: #f8fafc; transform: translateX(2px); }
      .node-meta {
        display: flex; flex-direction: column;
        .node-name { font-size: 14px; font-weight: 700; color: #334155; }
        .node-route { font-size: 10px; color: #94a3b8; font-family: monospace; }
      }
    }

    .sub-nodes { 
      grid-column: 1 / -1; padding: 4px 0 4px 24px; border-left: 1px dashed #e2e8f0; 
      margin: 4px 0 8px 12px;
      .node-list { grid-template-columns: 1fr; gap: 8px; }
      .node-item { padding: 8px 12px; border: none; background: transparent; &:hover { background: #f1f5f9; transform: none; } }
    }
    .expand-icon { transition: transform 0.3s ease; &.rotate { transform: rotate(180deg); } }

    .sticky-footer {
      position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
      width: calc(100% - 120px); max-width: 1000px; z-index: 100;
      .footer-wrap {
        background: #0f172a; padding: 16px 32px; border-radius: 20px;
        display: flex; justify-content: space-between; align-items: center;
        box-shadow: 0 15px 40px rgba(0,0,0,0.3);
        
        .security-status {
          display: flex; align-items: center; gap: 8px; color: #10b981;
          mat-icon { font-size: 18px; width: 18px; height: 18px; }
          span { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
        }

        .button-group {
          display: flex; gap: 12px;
          .cancel-btn { color: #94a3b8; font-weight: 700; height: 48px; }
          .save-btn {
            background: #3b82f6 !important; height: 48px; border-radius: 12px; padding: 0 24px;
            font-weight: 800; font-size: 14px;
            mat-icon { margin-right: 8px; }
          }
        }
      }
    }

    .empty-state { padding: 60px; text-align: center; }
    .loader-overlay {
      position: fixed; inset: 0; background: rgba(255,255,255,0.8); backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
      .loader-container { display: flex; flex-direction: column; align-items: center; gap: 16px; }
    }
  `]
})
export class RegisterRoleComponent implements OnInit {
  private fb = inject(FormBuilder);
  private roleService = inject(RoleService);
  private featureService = inject(FeatureService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  roleForm: FormGroup;
  isEditMode = signal(false);
  roleId = signal<number | null>(null);
  isLoading = signal(false);
  isSaving = signal(false);

  allFeatures = signal<Feature[]>([]);
  groupedFeatures = signal<Feature[]>([]);
  selectedFeatures = signal<Feature[]>([]);
  expandedNodes = signal<Set<number>>(new Set());

  roleLevels = ['All Levels', 'Regional Level', 'Division Level', 'District Level'];

  constructor() {
    this.roleForm = this.fb.group({
      name: ['', Validators.required],
      level: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.featureService.getActiveParentFeatures().subscribe({
      next: (data) => {
        this.groupedFeatures.set(data);
        const flat: Feature[] = [];
        const flatten = (features: Feature[]) => {
          features.forEach(f => {
            flat.push(f);
            if (f.subFeatures) flatten(f.subFeatures);
          });
        };
        flatten(data);
        this.allFeatures.set(flat);

        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
          this.isEditMode.set(true);
          this.roleId.set(Number(id));
          this.loadRoleDetails(Number(id));
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.showNotification('Failed to load system features', 'error');
        this.isLoading.set(false);
      }
    });
  }

  loadRoleDetails(id: number) {
    this.roleService.getRoleById(id)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (role) => {
          this.roleForm.patchValue({
            name: role.name,
            level: role.level || 'All Levels'
          });
          this.selectedFeatures.set([...role.features]);
          // Expand parents of selected features
          const parents = new Set<number>();
          this.allFeatures().forEach(f => {
            if (f.subFeatures?.some(sub => role.features.some(rf => rf.id === sub.id))) {
              parents.add(f.id);
            }
          });
          this.expandedNodes.set(parents);
        },
        error: () => this.showNotification('Failed to load role details', 'error')
      });
  }

  isFeatureSelected(feature: Feature): boolean {
    if (!feature.subFeatures || feature.subFeatures.length === 0) {
      return this.selectedFeatures().some(f => f.id === feature.id);
    }
    return feature.subFeatures.every(sub => this.isFeatureSelected(sub));
  }

  isFeatureIndeterminate(feature: Feature): boolean {
    if (!feature.subFeatures || feature.subFeatures.length === 0) return false;
    const isAnySelected = this.isAnyDescendantSelected(feature);
    const isAllSelected = this.isFeatureSelected(feature);
    return isAnySelected && !isAllSelected;
  }

  private isAnyDescendantSelected(feature: Feature): boolean {
    if (this.selectedFeatures().some(f => f.id === feature.id)) return true;
    if (feature.subFeatures) {
      return feature.subFeatures.some(sub => this.isAnyDescendantSelected(sub));
    }
    return false;
  }

  toggleFeatureDeep(feature: Feature) {
    const isNowSelected = !this.isFeatureSelected(feature);
    let current = [...this.selectedFeatures()];

    const modify = (f: Feature, select: boolean) => {
      if (select) {
        if (!current.some(c => c.id === f.id)) current.push(f);
      } else {
        current = current.filter(c => c.id !== f.id);
      }
      if (f.subFeatures) {
        f.subFeatures.forEach(sub => modify(sub, select));
      }
    };

    modify(feature, isNowSelected);

    if (isNowSelected) {
      this.ensureAncestorsSelected(feature, current);
    }

    this.selectedFeatures.set(current);
  }

  private ensureAncestorsSelected(child: Feature, current: Feature[]) {
    const parent = this.allFeatures().find(f => f.subFeatures?.some(s => s.id === child.id));
    if (parent) {
      if (!current.some(c => c.id === parent.id)) {
        current.push(parent);
      }
      this.ensureAncestorsSelected(parent, current);
    }
  }

  isAllSelected(): boolean {
    return this.groupedFeatures().length > 0 && this.groupedFeatures().every(f => this.isFeatureSelected(f));
  }

  isAnySelected(): boolean {
    return this.selectedFeatures().length > 0;
  }

  toggleAll() {
    const select = !this.isAllSelected();
    if (select) {
      this.selectedFeatures.set([...this.allFeatures()]);
    } else {
      this.selectedFeatures.set([]);
    }
  }

  isExpanded(id: number): boolean { return this.expandedNodes().has(id); }
  toggleExpand(id: number) {
    const caps = new Set(this.expandedNodes());
    caps.has(id) ? caps.delete(id) : caps.add(id);
    this.expandedNodes.set(caps);
  }

  save() {
    if (this.roleForm.invalid) return;
    this.isSaving.set(true);
    const data: Role = {
      name: this.roleForm.value.name,
      level: this.roleForm.value.level,
      features: this.selectedFeatures()
    };

    const request = this.isEditMode()
      ? this.roleService.updateRole(this.roleId()!, data)
      : this.roleService.createRole(data);

    request.pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.showNotification(`Role successfully saved!`, 'success');
          this.goBack();
        },
        error: () => this.showNotification('Failed to save role.', 'error')
      });
  }

  goBack() { this.router.navigate(['/portal/roles']); }

  private showNotification(message: string, type: 'success' | 'error') {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: type === 'success' ? ['success-snackbar'] : ['error-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }
}
