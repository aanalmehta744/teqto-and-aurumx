import { Component, Input } from '@angular/core';
import { FeatherIconsComponent } from '../feather-icons/feather-icons.component';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NgIf, NgClass } from '@angular/common';

@Component({
    selector: 'app-breadcrumb',
    templateUrl: './breadcrumb.component.html',
    styleUrls: ['./breadcrumb.component.scss'],
    standalone: true,
    imports: [RouterLink, FeatherIconsComponent, MatIconModule, NgIf, NgClass],
})
export class BreadcrumbComponent {
  @Input()
  title!: string;
  @Input()
  items!: string[];
  @Input()
  active_item!: string;
  /** When true, hides the standalone title text and lets the breadcrumb
   *  list take its place on the left. Defaults to false so every existing
   *  page keeps its current title+breadcrumb layout untouched. */
  @Input()
  hideTitle = false;

  constructor() {
    //constructor
  }
}