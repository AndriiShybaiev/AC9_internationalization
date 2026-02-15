import { getDatabase, ref, set, get, update } from "firebase/database";
import { app } from "../firebaseConfig";
import type { IUserService } from "./IUserService";

export class FirebaseUserService implements IUserService {
    async setUserRoles(uid: string, data: any): Promise<void> {
        const db = getDatabase(app);
        const userRef = ref(db, `users/${uid}`);
        await set(userRef, data);
    }

    async getAllUsers(): Promise<{ uid: string; [key: string]: any }[]> {
        const db = getDatabase(app);
        const usersRef = ref(db, "users");
        const snapshot = await get(usersRef);

        if (!snapshot.exists()) return [];

        const usersObj = snapshot.val();
        return Object.keys(usersObj).map((uid) => ({ uid, ...usersObj[uid] }));
    }

    async updateUserAdminRole(uid: string, isAdmin: boolean): Promise<void> {
        const db = getDatabase(app);
        const rolesRef = ref(db, `users/${uid}/roles`);
        await update(rolesRef, { admin: isAdmin });
    }
}
