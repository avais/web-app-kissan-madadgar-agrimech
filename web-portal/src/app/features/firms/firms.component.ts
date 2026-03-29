import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-firms',
    standalone: true,
    imports: [CommonModule],
    template: `<div class="p-4"><h1>Firms Page</h1><p>List of agricultural firms will appear here.</p></div>`,
    styles: []
})
export class FirmsComponent { }
