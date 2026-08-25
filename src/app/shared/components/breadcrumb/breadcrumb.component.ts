import { Component, Input, OnInit } from '@angular/core';
import { FeatherIconsComponent } from '../feather-icons/feather-icons.component';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '@core';

@Component({
    selector: 'app-breadcrumb',
    templateUrl: './breadcrumb.component.html',
    styleUrls: ['./breadcrumb.component.scss'],
    standalone: true,
    imports: [RouterLink, FeatherIconsComponent, MatIconModule],
})
export class BreadcrumbComponent implements OnInit {
  @Input()
  title!: string;
  @Input()
  items!: string[];
  @Input()
  active_item!: string;

  /** Home link target — resolved from the logged-in user's role/department so
   *  the breadcrumb "Home" works on every page for every role. */
  homePage = '/';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    const user = this.authService.currentUserValue as any;
    const role = user?.role;
    const dept = user?.department?.toLowerCase().trim();

    if (role === 'Admin') {
      this.homePage = '/admin/dashboard/main';
    } else if (role === 'Employee') {
      if (dept === 'bde') {
        this.homePage = '/client/dashboard';
      } else if (dept === 'ba') {
        this.homePage = '/ba/dashboard';
      } else {
        this.homePage = '/employee/dashboard';
      }
    } else {
      this.homePage = '/employee/dashboard';
    }
  }
}
