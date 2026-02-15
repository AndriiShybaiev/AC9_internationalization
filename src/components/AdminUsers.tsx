import { useContext, useEffect, useMemo, useState } from "react";
import userService from "../services/UserService";
import { AuthContext } from "../contexts/AuthContext";

type UserRow = {
    uid: string;
    email?: string;
    isAdmin: boolean;
};

export default function AdminUsers() {
    const { user: currentUser } = useContext(AuthContext);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>("");
    const [rows, setRows] = useState<UserRow[]>([]);

    const loadUsers = async () => {
        setLoading(true);
        setError("");

        try {
            const users = await userService.getAllUsers();
            const mapped: UserRow[] = users.map((u) => ({
                uid: u.uid,
                email: u.email,
                isAdmin: u.roles?.admin === true,
            }));

            mapped.sort((a, b) => (a.email ?? a.uid).localeCompare(b.email ?? b.uid));
            setRows(mapped);
        } catch (e: any) {
            setError(e?.message ?? String(e));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadUsers();
    }, []);

    const currentUid = currentUser?.uid;

    const visibleRows = useMemo(() => rows, [rows]);

    const toggleAdmin = async (r: UserRow) => {
        setError("");
        try {
            await userService.updateUserAdminRole(r.uid, !r.isAdmin);
            setRows((prev) =>
                prev.map((x) => (x.uid === r.uid ? { ...x, isAdmin: !x.isAdmin } : x))
            );
        } catch (e: any) {
            setError(e?.message ?? String(e));
        }
    };

    return (
        <div className="usersBox">
            <h4 className="subTitle">Gestión de usuarios</h4>

            <button onClick={loadUsers} disabled={loading}>
                {loading ? "Cargando..." : "Actualizar lista"}
            </button>

            {error && <p className="error-message">Error: {error}</p>}
            {!loading && !error && visibleRows.length === 0 && <p>No hay usuarios.</p>}

            {!loading && visibleRows.length > 0 && (
                <table className="usersTable">
                    <thead>
                    <tr>
                        <th>Email</th>
                        <th>UID</th>
                        <th>Admin</th>
                        <th>Acción</th>
                    </tr>
                    </thead>

                    <tbody>
                    {visibleRows.map((r) => {
                        const isMe = currentUid && r.uid === currentUid;
                        return (
                            <tr key={r.uid}>
                                <td>{r.email ?? "(sin email)"}</td>
                                <td style={{ fontFamily: "monospace" }}>{r.uid}</td>
                                <td>{r.isAdmin ? "Sí" : "No"}</td>
                                <td>
                                    <button onClick={() => toggleAdmin(r)} disabled={isMe}>
                                        {r.isAdmin ? "Quitar admin" : "Hacer admin"}
                                    </button>
                                    {isMe && <span style={{ marginLeft: 8 }}>(tú)</span>}
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            )}
        </div>
    );
}
