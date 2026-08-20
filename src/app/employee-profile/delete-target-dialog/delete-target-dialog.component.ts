import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
// import { EmployeesService } from ;
import { EmployeesService } from '../employees.service';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
export interface DialogData {
  target: {
    id: number;
    target_month: string;
    amount: number;
    achieved_amount: number;
  };
}


@Component({
  selector: 'app-delete-target-dialog',
  standalone: true,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButtonModule,
    MatDialogClose,
    CommonModule
  ],
  templateUrl: './delete-target-dialog.component.html',
  styleUrl: './delete-target-dialog.component.scss'
})
export class DeleteTargetDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DeleteTargetDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public employeesService: EmployeesService
  ) { }
  onNoClick(): void {
    this.dialogRef.close();
  }
  confirmDelete(): void {
    this.employeesService.deleteMonthlyTarget(this.data.target.id).subscribe(() => {
      this.dialogRef.close('confirm');
    });

  }
}
