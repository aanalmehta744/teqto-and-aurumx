import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClientsService } from 'app/client/clients/all-clients/clients.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatNativeDateModule } from '@angular/material/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { formatDate } from '@angular/common';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-add-followup',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatNativeDateModule,
    ReactiveFormsModule,
    CommonModule,
    MatIconModule,
  ],
  templateUrl: './add-followup.component.html',
  styleUrls: ['./add-followup.component.scss']
})
export class AddFollowupComponent {
  followupForm: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private clientsService: ClientsService,
    public dialogRef: MatDialogRef<AddFollowupComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { clientId: number, bdeId: number }
  ) {
    this.followupForm = this.fb.group({
      followup_date: ['', Validators.required],
      notes: ['', Validators.required],
      status: ['Hot', Validators.required]
    });
  }

  onSubmit() {
    if (this.followupForm.invalid) return;
    console.log(this.data);

    this.isSubmitting = true; // 🔒 lock submit

    // Format the date to 'yyyy-MM-dd' or any format your backend expects
    const formattedDate = formatDate(
      this.followupForm.value.followup_date,
      'yyyy-MM-dd',
      'en-IN'
    );

    const payload = {
      client_id: this.data.clientId,
      bde_id: this.data.bdeId,
      followup_date: formattedDate,
      notes: this.followupForm.value.notes,
      status: this.followupForm.value.status
    };

    // this.clientsService.addFollowup(this.data.clientId, payload).subscribe({
    //   next: () => this.dialogRef.close(true),
    //   error: (err) => console.error('Error adding follow-up:', err)
    // });

    this.clientsService.addFollowup(this.data.clientId, payload).subscribe({
      next: (res) => {
        this.dialogRef.close({
          success: true,
          message: res?.message || 'Follow-up added successfully'
        });
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || 'Failed to add follow-up'
        });
      }
    });

  }

  onCancel() {
    this.dialogRef.close(false);
  }
}
