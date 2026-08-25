import { Direction, BidiModule } from '@angular/cdk/bidi';
import { AfterViewInit, Component, EventEmitter, HostListener, Inject, Input, Output, Renderer2 } from '@angular/core';
import { DOCUMENT, NgClass, NgIf } from '@angular/common';
import { ConfigService } from '@config';
import { DirectionService, InConfiguration, RightSidebarService } from '@core';
import { Router, RouterOutlet } from '@angular/router';
import { RightSidebarComponent } from '../../right-sidebar/right-sidebar.component';
import { SidebarComponent } from '../../sidebar/sidebar.component';
import { HeaderComponent } from '../../header/header.component';
import { UnsubscribeOnDestroyAdapter } from '@shared';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: [],
  standalone: true,
  imports: [
    HeaderComponent,
    SidebarComponent,
    RightSidebarComponent,
    BidiModule,
    RouterOutlet,
    NgClass,
    NgIf
  ],
  providers: [RightSidebarService]
})
export class MainLayoutComponent
  extends UnsubscribeOnDestroyAdapter
  implements AfterViewInit {
  direction!: Direction;
  public config!: InConfiguration;
  isSidebarCollapsed = true;
  isHovered = false;
  isMobile: boolean = window.innerWidth < 1024;
  isMobileOpen: boolean = false;

  @HostListener('window:resize', [])
  onResize() {
    this.isMobile = window.innerWidth < 1024;
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  @Output() mobileExpandSidebar = new EventEmitter<void>();

  @HostListener('document:mouseover', ['$event'])
  onMouseOver(event: MouseEvent) {
    // Only relevant on desktop; bail out early on mobile to avoid work on every hover.
    if (this.isMobile) return;

    // Cache the sidebar element instead of querying the DOM on every mouse move.
    if (!this.sidebarEl) {
      this.sidebarEl = document.querySelector('app-sidebar');
    }

    const inside = !!this.sidebarEl?.contains(event.target as HTMLElement);
    const next = inside ? true : (this.isSidebarCollapsed ? false : this.isHovered);

    // Only assign when the value actually changes → avoids needless change detection.
    if (next !== this.isHovered) {
      this.isHovered = next;
    }
  }
  private sidebarEl: Element | null = null;
  navigateAndClose(path: string) {
    this.router.navigate([path]);
    if (this.isMobile) {
      this.isMobileOpen = false;
    }
  }

  ngOnInit(): void {
    const w = window.innerWidth;
    this.isMobile = w < 1024;
    this.isSidebarCollapsed = w < 1024;

    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth < 1024;
    });
  }


  constructor(
    private directoryService: DirectionService,
    private configService: ConfigService,
    private router: Router,
    @Inject(DOCUMENT) private document: Document,
    private renderer: Renderer2
  ) {
    super();
    this.config = this.configService.configData;
    this.subs.sink = this.directoryService.currentData.subscribe(
      (currentData) => {
        if (currentData) {
          this.direction = currentData === 'ltr' ? 'ltr' : 'rtl';
        } else {
          if (localStorage.getItem('isRtl')) {
            if (localStorage.getItem('isRtl') === 'true') {
              this.direction = 'rtl';
            } else if (localStorage.getItem('isRtl') === 'false') {
              this.direction = 'ltr';
            }
          } else {
            if (this.config) {
              if (this.config.layout.rtl === true) {
                this.direction = 'rtl';
                localStorage.setItem('isRtl', 'true');
              } else {
                this.direction = 'ltr';
                localStorage.setItem('isRtl', 'false');
              }
            }
          }
        }
      }
    );
  }
  ngAfterViewInit(): void {

    if (localStorage.getItem('theme')) {
      this.renderer.removeClass(this.document.body, this.config.layout.variant);
      this.renderer.addClass(
        this.document.body,
        localStorage.getItem('theme') as string
      );
    } else {
      this.renderer.addClass(this.document.body, this.config.layout.variant);
      localStorage.setItem('theme', this.config.layout.variant);
    }



    if (localStorage.getItem('choose_skin')) {
      this.renderer.removeClass(
        this.document.body,
        'theme-' + this.config.layout.theme_color
      );

      this.renderer.addClass(
        this.document.body,
        localStorage.getItem('choose_skin') as string
      );
      localStorage.setItem(
        'choose_skin_active',
        (localStorage.getItem('choose_skin') as string).substring(6)
      );
    } else {
      this.renderer.addClass(
        this.document.body,
        'theme-' + this.config.layout.theme_color
      );

      localStorage.setItem(
        'choose_skin',
        'theme-' + this.config.layout.theme_color
      );
      localStorage.setItem(
        'choose_skin_active',
        this.config.layout.theme_color
      );
    }



    if (localStorage.getItem('isRtl')) {
      if (localStorage.getItem('isRtl') === 'true') {
        this.setRTLSettings();
      } else if (localStorage.getItem('isRtl') === 'false') {
        this.setLTRSettings();
      }
    } else {
      if (this.config.layout.rtl == true) {
        this.setRTLSettings();
      } else {
        this.setLTRSettings();
      }
    }


    if (localStorage.getItem('menuOption')) {
      this.renderer.addClass(
        this.document.body,
        localStorage.getItem('menuOption') as string
      );
    } else {
      this.renderer.addClass(
        this.document.body,
        'menu_' + this.config.layout.sidebar.backgroundColor
      );
      localStorage.setItem(
        'menuOption',
        'menu_' + this.config.layout.sidebar.backgroundColor
      );
    }



    if (localStorage.getItem('choose_logoheader')) {
      this.renderer.addClass(
        this.document.body,
        localStorage.getItem('choose_logoheader') as string
      );
    } else {
      this.renderer.addClass(
        this.document.body,
        'logo-' + this.config.layout.logo_bg_color
      );
    }


    if (localStorage.getItem('collapsed_menu')) {
      if (localStorage.getItem('collapsed_menu') === 'true') {
        this.renderer.addClass(this.document.body, 'side-closed');
        this.renderer.addClass(this.document.body, 'submenu-closed');
      }
    } else {
      if (this.config.layout.sidebar.collapsed == true) {
        this.renderer.addClass(this.document.body, 'side-closed');
        this.renderer.addClass(this.document.body, 'submenu-closed');
        localStorage.setItem('collapsed_menu', 'true');
      } else {
        this.renderer.removeClass(this.document.body, 'side-closed');
        this.renderer.removeClass(this.document.body, 'submenu-closed');
        localStorage.setItem('collapsed_menu', 'false');
      }
    }


  }

  setRTLSettings() {
    document.getElementsByTagName('html')[0].setAttribute('dir', 'rtl');
    this.renderer.addClass(this.document.body, 'rtl');

    localStorage.setItem('isRtl', 'true');
  }
  setLTRSettings() {
    document.getElementsByTagName('html')[0].removeAttribute('dir');
    this.renderer.removeClass(this.document.body, 'rtl');

    localStorage.setItem('isRtl', 'false');
  }
}
