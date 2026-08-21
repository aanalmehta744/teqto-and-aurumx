import { DOCUMENT, NgClass, NgIf, CommonModule } from '@angular/common';
import { Component, Inject, ElementRef, OnInit, OnDestroy, Renderer2, Output, EventEmitter, Input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ConfigService } from '@config';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { LanguageService, InConfiguration, AuthService } from '@core';
import { NgScrollbar } from 'ngx-scrollbar';
import { MatMenuModule } from '@angular/material/menu';
import { FeatherIconsComponent } from '@shared/components/feather-icons/feather-icons.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import Swal from 'sweetalert2';

interface Notifications {
  message: string;
  time: string;
  icon: string;
  color: string;
  status: string;
}

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [
    RouterLink,
    NgClass,
    MatIconModule,
    MatButtonModule,
    FeatherIconsComponent,
    MatMenuModule,
    NgScrollbar,
    NgIf,
    CommonModule,
  ],
})
export class HeaderComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit, OnDestroy {
  public config!: InConfiguration;
  userImg: string = '';
  userName: string = 'Guest';
  homePage?: string;
  isNavbarCollapsed = true;
  userRole: string = '';
  userGender: string = '';
  isOpenSidebar?: boolean;
  docElement?: HTMLElement;
  @Input() collapsed: boolean = false;
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() mobileSidebarToggle = new EventEmitter<void>();
  @Input() isHovered: boolean = false;

  // Notifications (admin only)
  notifCount = 0;
  notifications: any[] = [];
  showNotifPanel = false;
  private notifInterval: any;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private renderer: Renderer2,
    public elementRef: ElementRef,
    private configService: ConfigService,
    private authService: AuthService,
    private router: Router,
    public languageService: LanguageService,
    private http: HttpClient
  ) {
    super();
  }

  // logo
  getLogUrl(): string {
    const isMobile = window.innerWidth < 425;
    if (isMobile) {
      return 'assets/images/Company_Logo.png'; // Mobile view
    }
    return this.collapsed && !this.isHovered ? 'assets/images/Company_Logo.png' : '../../../../assets/images/Company_Logo.png'; // Desktop view
  }

  ngOnInit() {
    this.config = this.configService.configData;

    // Safely handle the currentUser value
    const user = this.authService.currentUserValue;
    console.log("Current user", user);

    if (user) {
      const userRole = user.role;
      this.userRole = userRole;
      this.userImg = user.img; // Access img safely
      this.userGender = user.gender; // Access img safely
      this.docElement = document.documentElement;
      // Display user's first and last name
      this.userName = `${user.fullName}`;

   

if (userRole === 'Admin') {

  this.homePage = 'admin/dashboard/main';

} else if (userRole === 'Employee') {

  const department = user.department?.toLowerCase().trim();

  if (department === 'bde') {

    this.homePage = 'client/dashboard';

  } else if (department === 'ba') {

    this.homePage = 'ba/dashboard/main';

  } else {

    this.homePage = 'employee/dashboard';

  }

} else {

  this.homePage = 'employee/dashboard';

}
    }
  }

  private currentUserId: number | null = null;

  loadNotifCount() {
    this.http.get<{ count: number }>(`${environment.apiUrl}/notifications/count`)
      .subscribe({ next: r => this.notifCount = r.count, error: () => {} });
  }

  loadNotifications() {
    this.http.get<any[]>(`${environment.apiUrl}/notifications`)
      .subscribe({ next: d => { this.notifications = d; this.notifCount = d.filter(n => !n.is_read).length; }, error: () => {} });
  }

  loadUserNotifCount(userId: number) {
    this.http.get<{ count: number }>(`${environment.apiUrl}/notifications/user/${userId}/count`)
      .subscribe({ next: r => this.notifCount = r.count, error: () => {} });
  }

  loadUserNotifications(userId: number) {
    this.currentUserId = userId;
    this.http.get<any[]>(`${environment.apiUrl}/notifications/user/${userId}`)
      .subscribe({ next: d => { this.notifications = d; this.notifCount = d.filter(n => !n.is_read).length; }, error: () => {} });
  }

  toggleNotifPanel() {
    this.showNotifPanel = !this.showNotifPanel;
    if (this.showNotifPanel) {
      if (this.currentUserId) {
        this.loadUserNotifications(this.currentUserId);
      } else {
        this.loadNotifications();
      }
    }
  }

  markAllRead() {
    if (this.currentUserId) {
      this.http.put(`${environment.apiUrl}/notifications/user/${this.currentUserId}/read-all`, {})
        .subscribe({ next: () => { this.notifCount = 0; this.notifications.forEach(n => n.is_read = 1); }, error: () => {} });
    } else {
      this.http.put(`${environment.apiUrl}/notifications/read-all`, {})
        .subscribe({ next: () => { this.notifCount = 0; this.notifications.forEach(n => n.is_read = 1); }, error: () => {} });
    }
  }

  markRead(n: any) {
    if (n.is_read) return;
    this.http.put(`${environment.apiUrl}/notifications/${n.id}/read`, {})
      .subscribe({ next: () => { n.is_read = 1; this.notifCount = Math.max(0, this.notifCount - 1); }, error: () => {} });
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    if (this.notifInterval) clearInterval(this.notifInterval);
  }


  getImgUrl(gender: string): string {
    if (gender.toLowerCase() === 'female') return 'assets/images/female-profile.png';
    if (gender.toLowerCase() === 'male') return 'assets/images/male-profile.png';
    return 'assets/images/default-profile.png';
  }

  getProfileImgUrl(): string {
    if (this.userImg) {
      if (this.userImg.startsWith('http')) return this.userImg;
      return `${environment.apiUrl.replace('/api', '')}/uploads/employees/${this.userImg}`;
    }
    return this.getImgUrl(this.userGender || '');
  }



  mobileMenuSidebarOpen(event: Event, className: string) {
    const hasClass = (event.target as HTMLInputElement).classList.contains(
      className
    );
    if (hasClass) {
      this.renderer.removeClass(this.document.body, className);
    } else {
      this.renderer.addClass(this.document.body, className);
    }
  }

  callSidemenuCollapse() {
    const hasClass = this.document.body.classList.contains('side-closed');
    if (hasClass) {
      this.renderer.removeClass(this.document.body, 'side-closed');
      this.renderer.removeClass(this.document.body, 'submenu-closed');
      localStorage.setItem('collapsed_menu', 'false');
    } else {
      this.renderer.addClass(this.document.body, 'side-closed');
      this.renderer.addClass(this.document.body, 'submenu-closed');
      localStorage.setItem('collapsed_menu', 'true');
    }
  }

  // logout() {
  //   this.authService.logout();  // Clears token and user data
  //   this.router.navigate(['/authentication/login']);
  // }
  logout() {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to log out?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, logout',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.authService.logout();
        this.router.navigate(['/authentication/login']);
        // Swal.fire({
        //   icon: 'success',
        //   title: 'Logged Out',
        //   text: 'You have been successfully logged out.',
        //   confirmButtonText: 'Okay',
        //   confirmButtonColor: '#3085d6'
        // });
      }
    });
  }
  goToProfile() {
    this.router.navigate(['/employee-profile']); // Replace with your actual profile route
  }
}
