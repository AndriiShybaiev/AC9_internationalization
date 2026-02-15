import { Role } from "./IAuthService";

export interface IUserDatabaseService {
    getUserRoles(uid: string): Promise<Role[]>;
}
