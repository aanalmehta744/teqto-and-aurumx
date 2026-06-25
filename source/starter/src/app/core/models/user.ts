import { Role } from './role';

export class User {
  id!: number;
  img!: string;
  username!: string;
  password!: string;
  firstName!: string;
  lastName!: string;
  fullName!: string;
  role!: Role;
  token!: string;
  department!: string;
  leave_balance!: number;
  email!: string;
}
