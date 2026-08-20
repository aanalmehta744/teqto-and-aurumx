import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { ClientsService } from '../../clients.service';
import { MatButtonModule } from '@angular/material/button';
import Swal from 'sweetalert2';

export interface DialogData {
  id: number;
  fullName: string;
  company_name: string;
  email: string;
}

@Component({
    selector: 'app-delete',
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
    public clientService: ClientsService
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }

  confirmDelete(): void {
    this.clientService.deleteClient(this.data.id).subscribe({
      next: () => {
        // Pass 'true' to indicate successful deletion
      },
      error: (error) => {
        console.error('Error deleting client:', error);
       
      },
    });
  }
}
