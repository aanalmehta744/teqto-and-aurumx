import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeeDailyUpdateComponent } from './employee-daily-update.component';

describe('EmployeeDailyUpdateComponent', () => {
  let component: EmployeeDailyUpdateComponent;
  let fixture: ComponentFixture<EmployeeDailyUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeDailyUpdateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmployeeDailyUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
