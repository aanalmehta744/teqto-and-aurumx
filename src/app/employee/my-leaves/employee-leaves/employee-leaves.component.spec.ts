import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeeLeavesComponent } from './employee-leaves.component';

describe('EmployeeLeavesComponent', () => {
  let component: EmployeeLeavesComponent;
  let fixture: ComponentFixture<EmployeeLeavesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeLeavesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmployeeLeavesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
