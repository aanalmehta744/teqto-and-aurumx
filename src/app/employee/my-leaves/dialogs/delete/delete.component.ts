import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { MyLeavesService } from '../../my-leaves.service';
import { MatButtonModule } from '@angular/material/button';

export interface DialogData {
  id: number;
  leave_type: string;
  status: string;
  reason: string;
}

@Component({
    selector: 'app-delete:not(q)',
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
    public myLeavesService: MyLeavesService
  ) {}
  onNoClick(): void {
    this.dialogRef.close();
  }
  confirmDelete(): void {
    console.log(this.data);
    this.myLeavesService.deleteMyLeaves(this.data.id);
  }
}
