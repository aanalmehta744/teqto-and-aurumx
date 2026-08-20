import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllEmployeeDailyUpdateComponent } from './allemployee-daily-update.component';

describe('EmployeeDailyUpdateComponent', () => {
  let component: AllEmployeeDailyUpdateComponent;
  let fixture: ComponentFixture<AllEmployeeDailyUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllEmployeeDailyUpdateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllEmployeeDailyUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
