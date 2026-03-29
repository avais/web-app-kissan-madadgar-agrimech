import { Routes } from '@angular/router';
import { AppShellComponent } from './layout/app-shell/app-shell.component';
import { PortalLayoutComponent } from './layout/portal-layout/portal-layout.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'portal',
        component: PortalLayoutComponent,
        canActivate: [authGuard],
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            {
                path: 'dashboard',
                loadComponent: () => import('./features/portal/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
            },
            {
                path: 'convener-dashboard',
                loadComponent: () => import('./features/portal/convener-dashboard/convener-dashboard.component').then(m => m.ConvenerDashboardComponent)
            },
            {
                path: 'locations',
                children: [
                    {
                        path: 'region',
                        loadComponent: () => import('./features/portal/locations/manage-region/manage-region.component').then(m => m.ManageRegionComponent)
                    },
                    {
                        path: 'division',
                        loadComponent: () => import('./features/portal/locations/manage-division/manage-division.component').then(m => m.ManageDivisionComponent)
                    },
                    {
                        path: 'district',
                        loadComponent: () => import('./features/portal/locations/manage-district/manage-district.component').then(m => m.ManageDistrictComponent)
                    },
                    {
                        path: 'tehsil',
                        loadComponent: () => import('./features/portal/locations/manage-markaz/manage-markaz.component').then(m => m.ManageTehsilComponent)
                    },
                    {
                        path: 'tehsil/register',
                        loadComponent: () => import('./features/portal/locations/manage-markaz/register-markaz/register-markaz.component').then(m => m.RegisterTehsilComponent)
                    },
                    {
                        path: 'tehsil/edit/:id',
                        loadComponent: () => import('./features/portal/locations/manage-markaz/register-markaz/register-markaz.component').then(m => m.RegisterTehsilComponent)
                    }
                ]
            },
            {
                path: 'applications',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./features/portal/manage-farmer-applications/manage-farmer-applications.component').then(m => m.ManageFarmerApplicationsComponent)
                    },
                    {
                        path: 'register',
                        loadComponent: () => import('./features/portal/manage-farmer-applications/register-farmer-application/register-farmer-application.component').then(m => m.RegisterFarmerApplicationComponent)
                    },
                    {
                        path: 'details/:id',
                        loadComponent: () => import('./features/portal/manage-farmer-applications/application-details/application-details.component').then(m => m.ApplicationDetailsComponent)
                    },
                    {
                        path: 'booking',
                        loadComponent: () => import('./features/portal/manage-bookings/manage-bookings.component').then(m => m.ManageBookingsComponent)
                    }
                ]
            },
            {
                path: 'implements',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./features/portal/manage-implements/manage-implements.component').then(m => m.ManageImplementsComponent)
                    },
                    {
                        path: 'create',
                        loadComponent: () => import('./features/portal/manage-implements/register-implement/register-implement.component').then(m => m.RegisterImplementComponent)
                    },
                    {
                        path: 'edit/:id',
                        loadComponent: () => import('./features/portal/manage-implements/register-implement/register-implement.component').then(m => m.RegisterImplementComponent)
                    }
                ]
            },
            {
                path: 'roles',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./features/portal/manage-roles/manage-roles.component').then(m => m.ManageRolesComponent)
                    },
                    {
                        path: 'register',
                        loadComponent: () => import('./features/portal/manage-roles/register-role/register-role.component').then(m => m.RegisterRoleComponent)
                    },
                    {
                        path: 'edit/:id',
                        loadComponent: () => import('./features/portal/manage-roles/register-role/register-role.component').then(m => m.RegisterRoleComponent)
                    }
                ]
            },
            {
                path: 'features',
                loadComponent: () => import('./features/portal/manage-features/manage-features.component').then(m => m.ManageFeaturesComponent)
            },
            {
                path: 'balloting',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./features/portal/manage-balloting/manage-balloting.component').then(m => m.ManageBallotingComponent)
                    },
                    {
                        path: 'process',
                        loadComponent: () => import('./features/portal/manage-balloting/register-balloting/register-balloting.component').then(m => m.RegisterBallotingComponent)
                    }
                ]
            },
            {
                path: 'reporting',
                loadComponent: () => import('./features/portal/reporting/reporting.component').then(m => m.ReportingComponent)
            },
            {
                path: 'machine-live-reporting',
                loadComponent: () => import('./features/portal/machine-live-reporting/machine-live-reporting').then(m => m.MachineLiveReportingComponent)
            },
            {
                path: 'manufacturers',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./features/portal/manage-firms/manage-firms.component').then(m => m.ManageFirmsComponent)
                    },
                    {
                        path: 'register',
                        loadComponent: () => import('./features/portal/manage-firms/register-firm/register-firm.component').then(m => m.RegisterFirmComponent)
                    },
                    {
                        path: 'edit/:id',
                        loadComponent: () => import('./features/portal/manage-firms/register-firm/register-firm.component').then(m => m.RegisterFirmComponent)
                    }
                ]
            },
            {
                path: 'users',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./features/portal/manage-users/manage-users.component').then(m => m.ManageUsersComponent)
                    },
                    {
                        path: 'register',
                        loadComponent: () => import('./features/portal/manage-users/register-user/register-user.component').then(m => m.RegisterUserComponent)
                    },
                    {
                        path: 'edit/:id',
                        loadComponent: () => import('./features/portal/manage-users/register-user/register-user.component').then(m => m.RegisterUserComponent)
                    }
                ]
            },
            {
                path: 'projects',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./features/portal/manage-projects/manage-projects.component').then(m => m.ManageProjectsComponent)
                    },
                    {
                        path: 'register',
                        loadComponent: () => import('./features/portal/manage-projects/register-project/register-project.component').then(m => m.RegisterProjectComponent)
                    },
                    {
                        path: 'edit/:id',
                        loadComponent: () => import('./features/portal/manage-projects/register-project/register-project.component').then(m => m.RegisterProjectComponent)
                    }
                ]
            },
            {
                path: 'quality-inspection',
                children: [
                    {
                        path: '',
                        pathMatch: 'full',
                        redirectTo: 'process'
                    },
                    {
                        path: 'process',
                        loadComponent: () => import('./features/portal/quality-inspection-process/quality-inspection-process.component').then(m => m.QualityInspectionProcessComponent)
                    },
                    {
                        path: 'details',
                        loadComponent: () => import('./features/portal/quality-inspection-process/inspection-details-view/inspection-details-view.component').then(m => m.InspectionDetailsViewComponent)
                    },
                    {
                        path: 'form/:id',
                        loadComponent: () => import('./features/portal/quality-inspection-process/qic-form/qic-form.component').then(m => m.QualityInspectionFormComponent)
                    },
                    {
                        path: 'wizard/:id',
                        loadComponent: () => import('./features/portal/quality-inspection-process/qic-wizard/qic-wizard.component').then(m => m.QicWizardComponent)
                    },
                    {
                        path: 'initiate',
                        loadComponent: () => import('./features/portal/quality-inspection-process/initiate-quality-inspection/initiate-quality-inspection.component').then(m => m.InitiateQualityInspectionComponent)
                    },
                    {
                        path: 'reports',
                        loadComponent: () => import('./features/portal/quality-inspection-process/quality-inspection-reports/quality-inspection-reports.component').then(m => m.QualityInspectionReportsComponent)
                    },
                    {
                        path: 'inspection-report-view',
                        loadComponent: () => import('./features/portal/quality-inspection-process/inspection-report-view/inspection-report-view.component').then(m => m.InspectionReportViewComponent)
                    }
                ]
            }
        ]
    },
    {
        path: '',
        component: AppShellComponent,
        children: [
            {
                path: '',
                redirectTo: 'home',
                pathMatch: 'full'
            },
            {
                path: 'home',
                loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
            },
            {
                path: 'search',
                loadComponent: () => import('./features/search/search.component').then(m => m.SearchComponent)
            },
            {
                path: 'firms',
                loadComponent: () => import('./features/firms/firms.component').then(m => m.FirmsComponent)
            },
            {
                path: 'news',
                loadComponent: () => import('./features/news/news.component').then(m => m.NewsComponent)
            },
            {
                path: 'imei-verification',
                loadComponent: () => import('./features/imei-verification/imei-verification.component').then(m => m.ImeiVerificationComponent)
            },
            {
                path: 'verify-report',
                loadComponent: () => import('./features/report-verification/report-verification.component').then(m => m.ReportVerificationComponent)
            },
            {
                path: 'qic-inspection-report',
                loadComponent: () => import('./features/qic-inspection-report/qic-inspection-report.component').then(m => m.QicInspectionReportComponent)
            },
            {
                path: 'my-machines',
                loadComponent: () => import('./features/my-machines/my-machines.component').then(m => m.MyMachinesComponent),
                canActivate: [authGuard]
            }
        ]
    }
];
