import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddTargetDialogComponent } from './add-target-dialog.component';

describe('AddTargetDialogComponent', () => {
  let component: AddTargetDialogComponent;
  let fixture: ComponentFixture<AddTargetDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddTargetDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddTargetDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
