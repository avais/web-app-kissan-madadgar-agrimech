import { HttpInterceptorFn } from '@angular/common/http';

export const projectInterceptor: HttpInterceptorFn = (req, next) => {
    const projectTypeId = localStorage.getItem('selectedProjectTypeId');

    if (projectTypeId) {
        const cloned = req.clone({
            setHeaders: {
                'X-Project-Type-Id': projectTypeId
            }
        });
        return next(cloned);
    }

    return next(req);
};
