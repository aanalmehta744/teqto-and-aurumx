import { Route } from "@angular/router";
import { AttendancesComponent } from "./attendance.component";
import { TodayComponent } from "./today/today.component";
import { EmployeeAttendanceComponent } from "./employee-attendance/employee-attendance.component";

export const EMPLOYEEATTENDANCE_ROUTE: Route[] = [
    {
        path: "",
        component: AttendancesComponent,
    },
    {
        path: "employee-attendance",
        component: EmployeeAttendanceComponent,
    },
    {
        path: "today",
        component: TodayComponent,
    },
]