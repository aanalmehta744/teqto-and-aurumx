import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { LeavesService } from '../leaves.service';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

export interface DialogData {
  id: number;
  start_date: string;
  leave_type: string;
  employee_name: string;
}

@Component({
  selector: 'app-delete:not(k)',
  template: `
<h3 mat-dialog-title class="text-xl font-semibold text-gray-800 mb-4">Are you sure?</h3>

<div mat-dialog-content class="space-y-2">
  <ul class="space-y-1">
    <li>
      <p class="flex gap-1"><span class="font-semibold text-[#00383F]"> Name: </span>{{data.employee_name}}</p>
    </li>
    <li>
      <p class="flex gap-1"><span class="font-semibold text-[#00383F]"> Leave Type: </span>{{ data.leave_type }}</p>
    </li>
    <li>
      <p class="flex gap-1">
        <span class="font-semibold text-[#00383F]">From: </span>{{data.start_date | date}}
      </p>
    </li>
  </ul>
</div>
<div mat-dialog-actions class="mt-4 flex justify-end gap-3">
  <button mat-flat-button color="warn" [mat-dialog-close]="1" (click)="confirmDelete()">
    Delete
  </button>
  <button mat-flat-button (click)="onNoClick()" tabindex="-1">Cancel</button>
</div>
`,
  standalone: true,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButtonModule,
    MatDialogClose,
    DatePipe,
  ],
})
export class DeleteComponent {
  constructor(
    public dialogRef: MatDialogRef<DeleteComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public leavesService: LeavesService
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }

  confirmDelete(): void {
    this.leavesService.deleteLeaves(this.data.id);
  }
}
