import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BdeEmployeeComponent } from './bde-employee.component';

describe('BdeEmployeeComponent', () => {
  let component: BdeEmployeeComponent;
  let fixture: ComponentFixture<BdeEmployeeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BdeEmployeeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BdeEmployeeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
