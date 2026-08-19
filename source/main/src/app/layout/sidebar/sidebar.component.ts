
import {
  Router,
  NavigationEnd,
  RouterLinkActive,
  RouterLink,
} from '@angular/router';
import { CommonModule, DOCUMENT, NgClass, NgIf } from '@angular/common';
import {
  Component,
  Inject,
  ElementRef,
  OnInit,
  Renderer2,
  HostListener,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { ROUTES } from './sidebar-items';
import { AuthService } from '@core';
import { environment } from 'environments/environment';
import { RouteInfo } from './sidebar.metadata';
import { TranslateModule } from '@ngx-translate/core';
import { FeatherModule } from 'angular-feather';
import { NgScrollbar } from 'ngx-scrollbar';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: true,
  imports: [
    NgScrollbar,
    RouterLinkActive,
    RouterLink,
    NgClass,
    FeatherModule,
    TranslateModule,
    NgIf,
    CommonModule
  ],
})
export class SidebarComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit {
  public sidebarItems: RouteInfo[] = [];
  public innerHeight?: number;
  public bodyTag!: HTMLElement;
  listMaxHeight?: string;
  listMaxWidth?: string;
  userFullName?: string;
  userImg: string = '';
  userGender: string = '';
  userType?: string;
  headerHeight = 70;
  currentRoute?: string;
  isMobileView: boolean = window.innerWidth < 1024;
  @Input() collapsed: boolean = false;
  @Input() isHovered: boolean = false;

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobileView = window.innerWidth < 1024;
  }

  get isCollapsed(): boolean {
    return this.collapsed && !this.isHovered;
  }

  @Output() closeSidebarAfterNavigation = new EventEmitter<void>();

  navigateTo(path: string) {
    this.router.navigate([path]);
    if (window.innerWidth < 1024) {
      this.closeSidebarAfterNavigation.emit(); // Mobile sidebar auto-close
    }
  }

  navigateOrToggle(item: RouteInfo) {
    if (item.submenu?.length) {
      this.toggleMenu(item);
    } else if (item.newTab) {
      window.open(item.path, '_blank');
    } else {
      this.router.navigate([item.path]);
      if (window.innerWidth < 1024) {
        this.closeSidebarAfterNavigation.emit();
      }
    }
  }

  navigateSubmenu(path: string) {
    this.router.navigate([path]);
    if (window.innerWidth < 1024) {
      this.closeSidebarAfterNavigation.emit(); // Auto close sidebar in mobile
    }
  }

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private router: Router,
    private renderer: Renderer2,
    public elementRef: ElementRef,
    private authService: AuthService,
  ) {
    super();
    this.elementRef.nativeElement.closest('body');
    this.subs.sink = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentRoute = event.url;
        this.renderer.removeClass(this.document.body, 'overlay-open');
        // Automatically open menus for current route
        this.openActiveMenus();
      }
    });
  }


  // toggle-menu
  toggleMenu(clickedItem: RouteInfo): void {
    // Auto-close all other main menus
    this.sidebarItems.forEach(item => {
      if (item !== clickedItem) {
        item.isOpen = false;

        // Also close nested submenu if needed
        item.submenu?.forEach(sub => sub.isOpen = false);
      }
    });

    // Toggle current menu
    clickedItem.isOpen = !clickedItem.isOpen;

    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      this.renderer.addClass(this.document.body, 'overlay-open');
    }
  }


  ngOnInit() {
    if (this.authService.currentUserValue) {
      const user = this.authService.currentUserValue;
      const userRole = user.role?.toLowerCase().trim() ?? '';
      const userDepartment = user.department?.toLowerCase().trim() ?? '';

      this.userFullName = user.fullName;
      this.userGender = user.gender;
      this.userImg = user.img || this.getImgUrl(user.gender);

      // this.sidebarItems = ROUTES.filter(item => {
      //   const roles = (item.role ?? []).map(r => r.toLowerCase());
      //   const depts = (item.department ?? []).map(d => d.toLowerCase());

      //   const roleMatch = roles.includes(userRole) || roles.includes('all');
      //   const deptMatch = depts.includes(userDepartment) || depts.includes('all') || userRole === 'admin' || userRole === 'ba';

      //   if (!(roleMatch && deptMatch)) return false;

      //   if (item.submenu && item.submenu.length > 0) {
      //     item.submenu = item.submenu.filter(sub => {
      //       if (sub.path === '/employee/attendance') return true;
      //       if (userRole === 'admin' || userRole === 'ba') return true;
      //       return sub.department?.map(d => d.toLowerCase()).includes(userDepartment);
      //     });
      //   }

      //   return true;
      // });

      // Initialize open state
      this.sidebarItems = ROUTES.filter(item => {
  const roles = (item.role ?? []).map(r => r.toLowerCase().trim());
  const depts = (item.department ?? []).map(d => d.toLowerCase().trim());

  // Admin can only see Admin menus
  if (userRole === 'admin') {
    return roles.includes('admin');
  }

  // All non-admin users must have Employee role
  if (userRole === 'employee') {
    // HR employee
    if (userDepartment === 'hr') {
      return (
        roles.includes('employee') &&
        depts.includes('hr')
      );
    }

    // BDE employee
    if (userDepartment === 'bde') {
      return (
        roles.includes('employee') &&
        depts.includes('bde')
      );
    }

    // BA employee
    if (userDepartment === 'ba') {
      return (
        roles.includes('employee') &&
        depts.includes('ba')
      );
    }

    // Other employee departments
    return (
      roles.includes('employee') &&
      depts.includes(userDepartment)
    );
  }

  return false;
});
      this.sidebarItems.forEach(item => {
        item.isOpen = false;
        if (item.submenu) {
          item.submenu.forEach(subItem => {
            subItem.isOpen = false;
            if (subItem.submenu) {
              subItem.submenu.forEach(nestedItem => nestedItem.isOpen = false);
            }
          });
        }
      });

      // if (userRole === 'admin') this.userType = 'Admin';
      // else if (userRole === 'bde') this.userType = 'BDE';
      // else if (userRole === 'employee') this.userType = 'Employee';
      // else if (userRole === 'ba') this.userType = 'BA';
      // else this.userType = 'Admin';
      if (userRole === 'admin') {
  this.userType = 'Admin';
} else if (userRole === 'employee' && userDepartment === 'bde') {
  this.userType = 'BDE';
} else if (userRole === 'employee' && userDepartment === 'ba') {
  this.userType = 'BA';
} else if (userRole === 'employee' && userDepartment === 'hr') {
  this.userType = 'HR';
} else if (userRole === 'employee') {
  this.userType = 'Employee';
} else {
  this.userType = 'Employee';
}
    }

    this.initLeftSidebar();
    this.bodyTag = this.document.body;

    // ✅ Make sure active menus are opened after sidebarItems initialized
    setTimeout(() => this.openActiveMenus(), 0);
  }



  isRouteActive(path?: string): boolean {
    if (!path || !this.currentRoute) return false;
    return this.currentRoute === path;
  }

  private openActiveMenus(): void {
    const openRecursive = (items: RouteInfo[]) => {
      items.forEach(item => {
        if (item.submenu?.length) {
          // Check if any child or nested submenu matches the current route
          const hasActiveChild = item.submenu.some(sub =>
            this.currentRoute?.startsWith(sub.path) || this.checkNestedActive(sub)
          );

          item.isOpen = hasActiveChild;

          // Recursively check nested submenus
          openRecursive(item.submenu);
        }
      });
    };

    openRecursive(this.sidebarItems);
  }

  private checkNestedActive(item: RouteInfo): boolean {
    if (!item.submenu?.length) return false;
    return item.submenu.some(sub =>
      this.currentRoute?.startsWith(sub.path) || this.checkNestedActive(sub)
    );
  }


  getImgUrl(gender: string): string {
    if (gender?.toLowerCase() === 'female') return 'assets/images/female-profile.png';
    if (gender?.toLowerCase() === 'male') return 'assets/images/male-profile.png';
    return 'assets/images/default-profile.png';
  }

  getProfileImgUrl(): string {
    if (this.userImg && !this.userImg.startsWith('assets/')) {
      if (this.userImg.startsWith('http')) return this.userImg;
      return `${environment.apiUrl.replace('/api', '')}/uploads/employees/${this.userImg}`;
    }
    return this.userImg || this.getImgUrl(this.userGender || '');
  }

  @HostListener('window:resize', ['$event'])
  windowResizecall() {
    this.setMenuHeight();
    this.checkStatuForResize(false);
  }

  @HostListener('document:mousedown', ['$event'])
  onGlobalClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.renderer.removeClass(this.document.body, 'overlay-open');
    }
  }

  initLeftSidebar() {
    this.setMenuHeight();
    this.checkStatuForResize(true);
  }

  setMenuHeight() {
    this.innerHeight = window.innerHeight;
    const height = this.innerHeight - this.headerHeight;
    this.listMaxHeight = height + '';
    this.listMaxWidth = '500px';
  }

  isOpen() {
    return this.bodyTag.classList.contains('overlay-open');
  }

  checkStatuForResize(firstTime: boolean) {
    if (window.innerWidth < 1025) {
      this.renderer.addClass(this.document.body, 'ls-closed');
    } else {
      this.renderer.removeClass(this.document.body, 'ls-closed');
    }
  }

  mouseHover() {
    const body = this.elementRef.nativeElement.closest('body');
    if (body.classList.contains('submenu-closed')) {
      this.renderer.addClass(this.document.body, 'side-closed-hover');
      this.renderer.removeClass(this.document.body, 'submenu-closed');
    }

    if (this.isMobileView) return;
  }

  mouseOut() {
    const body = this.elementRef.nativeElement.closest('body');
    if (body.classList.contains('side-closed-hover')) {
      this.renderer.removeClass(this.document.body, 'side-closed-hover');
      this.renderer.addClass(this.document.body, 'submenu-closed');
    }

    if (this.isMobileView) return;
  }

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
}