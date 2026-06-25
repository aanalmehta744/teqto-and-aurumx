import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteTargetDialogComponent } from './delete-target-dialog.component';

describe('DeleteTargetDialogComponent', () => {
  let component: DeleteTargetDialogComponent;
  let fixture: ComponentFixture<DeleteTargetDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteTargetDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeleteTargetDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
