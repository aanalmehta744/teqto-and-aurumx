import { DOCUMENT, NgClass, NgIf } from '@angular/common';
import { Component, Inject, ElementRef, OnInit, Renderer2, Output, EventEmitter, Input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ConfigService } from '@config';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { LanguageService, InConfiguration, AuthService } from '@core';
import { NgScrollbar } from 'ngx-scrollbar';
import { MatMenuModule } from '@angular/material/menu';
import { FeatherIconsComponent } from '@shared/components/feather-icons/feather-icons.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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
    NgIf
  ],
})
export class HeaderComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit {
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

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private renderer: Renderer2,
    public elementRef: ElementRef,
    private configService: ConfigService,
    private authService: AuthService,
    private router: Router,
    public languageService: LanguageService
  ) {
    super();
  }

  // logo
  getLogUrl(): string {
    const isMobile = window.innerWidth < 425;
    if (isMobile) {
      return 'assets/images/favicon-150x150.jpg'; // Mobile view
    }
    return this.collapsed && !this.isHovered ? 'assets/images/favicon-150x150.jpg' : '../../../../assets/images/teqto_infotech_logo.png';
  }

  ngOnInit() {
    this.config = this.configService.configData;

    // Safely handle the currentUser value
    const user = this.authService.currentUserValue;
    console.log("Current user", user);

    if (user) {
      const userRole = user.role;
      this.userImg = user.img; // Access img safely
      this.userGender = user.gender; // Access img safely
      this.docElement = document.documentElement;
      // Display user's first and last name
      this.userName = `${user.fullName}`;

      if (userRole === 'Admin') {
        this.homePage = 'admin/dashboard/main';
      } else if (userRole === 'BDE') {
        this.homePage = 'client/dashboard';
      } else if (userRole === 'Employee') {
        this.homePage = 'employee/dashboard';
      } else {
        this.homePage = 'admin/dashboard/main';
      }
    }
  }


  getImgUrl(gender: string): string {

    if (gender.toLowerCase() === 'female') {
      return 'assets/images/female-profile.png';
    } else if (gender.toLowerCase() === 'male') {
      return 'assets/images/male-profile.png';
    }

    return 'assets/images/default-profile.png'; // Fallback
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
