import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { ClientsService } from '../all-clients/clients.service';
import { CommonModule } from '@angular/common';
import { AddFollowupComponent } from './dialog/add-followup/add-followup.component';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '@core';
import { MatButtonModule } from '@angular/material/button';
import { formatDate } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-client-details',
  standalone: true,
  imports: [
    BreadcrumbComponent,
    MatProgressBarModule,
    MatTabsModule,
    MatIconModule,
    CommonModule,
    MatButtonModule,
  ],
  templateUrl: './client-details.component.html',
  styleUrls: ['./client-details.component.scss']
})
export class ClientDetailsComponent implements OnInit {
  clientId: string | null = null;
  client: any = null;
  loading: boolean = true;
  error: string | null = null;
  followups: any[] = [];
  loggedInBdeId: number | null = null;
  showPlatformPopup = false;
  showPlatformPassword = false;

  constructor(
    private route: ActivatedRoute,
    private clientService: ClientsService,
    private dialog: MatDialog,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // Get the 'id' from the route parameters
    this.clientId = this.route.snapshot.paramMap.get('id');
    if (this.clientId) {
      console.log('Client ID from URL:', this.clientId);
      this.getClientDetails();
      this.loadClientFollowups(this.clientId);
    }
    const user = this.authService.currentUserValue;
    if (!user) {
      console.error('User not logged in');
      return;
    }
    console.log("Logged user BDE ID ", user.id);
  }
  getClientDetails(): void {
    this.clientService.getClientById(this.clientId!).subscribe({
      next: (data) => {
        this.client = data;
        console.log("Client Recode", this.client);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error loading client data';
        console.error(err);
        this.loading = false;
      }
    });
  }
  loadClientFollowups(clientId: string): void {
    this.clientService.getClientFollowups(clientId).subscribe((data) => {
      this.followups = data;
    });
  }
  openAddFollowupDialog(): void {
    const user = this.authService.currentUserValue;
    if (!user) {
      console.error('User not logged in');
      return;
    }
    console.log("Logged user BDE ID ", user.id);
    // Open your follow-up dialog here
    console.log(this.client);
    console.log("Open Add Follow-up Dialog for Client ID:", this.clientId);
    const dialogRef = this.dialog.open(AddFollowupComponent, {
      width: '500px',
      data: {
        clientId: this.clientId,  // Use the dynamically fetched clientId
        bdeId: user.id  // Use a property from the fetched client object

      }
    });
    dialogRef.afterClosed().subscribe(result => {
      console.log('Dialog result:', result); // optional debug

      if (result?.success) {
        // optional SweetAlert (if you want it here)
        Swal.fire({
          icon: 'success',
          title: 'Follow-up Added',
          text: result.message || 'Follow-up added successfully',
          confirmButtonText: 'Okay'
        });

        this.loadClientFollowups(this.clientId!);
      }
    });

    // dialogRef.afterClosed().subscribe(result => {
    //   if (result) {
    //     // Refresh the follow-up list if a new follow-up was added
    //     this.loadClientFollowups(this.clientId!);
    //   }
    // });
  }
  openPlatformPopup(): void {
    this.showPlatformPassword = false;
    this.showPlatformPopup = true;
  }

  closePlatformPopup(): void {
    this.showPlatformPopup = false;
    this.showPlatformPassword = false;
  }

  isFollowupComplete(followupDate: string): boolean {
    // Get today's date (reset the time part) and format it as 'yyyy-MM-dd'
    const today = new Date();
    const todayString = formatDate(today, 'yyyy-MM-dd', 'en-US');
    // Format the follow-up date as 'yyyy-MM-dd'
    const followupDateObj = new Date(followupDate);
    const followupDateString = formatDate(followupDateObj, 'yyyy-MM-dd', 'en-US');

    // Compare the dates (ignoring time and time zone differences)
    return followupDateString < todayString;
  }

}
