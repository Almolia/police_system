import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function AdminPanel() {
    const [users, setUsers] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);

    useEffect(() => {
        // Admin must be able to change roles without intervention in code [cite: 116]
        Promise.all([api.get('accounts/users/'), api.get('accounts/roles/')]).then(([u, r]) => {
            setUsers(u.data);
            setRoles(r.data);
        });
    }, []);

    const updateRole = async (userId: number, roleId: number) => {
        await api.patch(`accounts/users/${userId}/`, { role: roleId });
        alert("Personnel record updated.");
    };

    return (
        <div className="h-full p-12 bg-slate-950 overflow-y-auto">
            <h2 className="text-amber-500 font-black text-3xl uppercase tracking-tighter italic mb-8">System Authority Center</h2>
            <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
                <table className="w-full text-left text-white text-xs">
                    <thead className="bg-slate-800 text-slate-500 uppercase font-black text-[10px]">
                        <tr><th className="p-6">User</th><th className="p-6">Current Role</th><th className="p-6">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-slate-800/50">
                                <td className="p-6">{u.username}</td>
                                <td className="p-6 font-bold text-blue-400">{u.role_name}</td>
                                <td className="p-6">
                                    <select onChange={(e) => updateRole(u.id, parseInt(e.target.value))} className="bg-slate-950 border border-slate-700 p-2 rounded text-[10px]">
                                        <option>Assign Role...</option>
                                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}