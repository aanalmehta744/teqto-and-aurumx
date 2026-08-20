import { Route } from "@angular/router";
import { AddPaymentComponent } from "./add-payment/add-payment.component";
import { InvoiceComponent } from "./invoice/invoice.component";
import { AllpaymentComponent } from "./allpayment/allpayment.component";
import { Page404Component } from "../../authentication/page404/page404.component";
export const ACCOUNT_ROUTE: Route[] = [
  {
    path: "all-payment",
    component: AllpaymentComponent,
  },
  {
    path: "add-payment",
    component: AddPaymentComponent,
  },
  {
    path: "invoice",
    component: InvoiceComponent,
  },
  { path: "**", component: Page404Component },
];
