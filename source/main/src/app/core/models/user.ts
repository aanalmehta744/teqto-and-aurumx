import { Role } from './role';

export class User {
  id!: number;
  img!: string;
  uploadImg!: string;
  username!: string;
  fullName!: string;
  password!: string;
  first_name!: string;
  last_name!: string;
  role!: Role;
  token!: string;
  gender!: string;
  leave_balance!: number;
  department!: string;
}
