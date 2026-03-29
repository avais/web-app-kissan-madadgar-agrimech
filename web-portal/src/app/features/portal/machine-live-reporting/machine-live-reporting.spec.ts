import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MachineLiveReporting } from './machine-live-reporting';

describe('MachineLiveReporting', () => {
  let component: MachineLiveReporting;
  let fixture: ComponentFixture<MachineLiveReporting>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MachineLiveReporting]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MachineLiveReporting);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
