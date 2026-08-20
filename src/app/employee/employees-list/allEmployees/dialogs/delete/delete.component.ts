import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { EmployeesService } from '../../employees.service';
import { MatButtonModule } from '@angular/material/button';

export interface DialogData {
  id: number;
  fullName: string;
  department: string;
  mobile: string;
}
@Component({
    selector: 'app-delete:not(c)',
    templateUrl: './delete.component.html',
    styleUrls: ['./delete.component.scss'],
    standalone: true,
    imports: [
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatButtonModule,
        MatDialogClose,
    ],
})
export class DeleteDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DeleteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public employeesService: EmployeesService
  ) {}
  onNoClick(): void {
    this.dialogRef.close();
  }
  confirmDelete(): void {
    this.employeesService.deleteEmployees(this.data.id);
  }
}
