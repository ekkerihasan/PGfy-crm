import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, TOKEN_KEY } from '../lib/api';
import type { User } from '../types/api';
interface Auth { user: User | null; loading: boolean; login: (email: string, password: string) => Promise<void>; logout: () => void; }
const AuthContext = createContext<Auth | undefined>(undefined);
export function AuthProvider({ children }: { children: ReactNode }) {
 const [user,setUser] = useState<User | null>(null); const [loading,setLoading] = useState(true);
 const logout = () => { localStorage.removeItem(TOKEN_KEY); setUser(null); };
 useEffect(() => {
  let active = true;
  const onLogout = () => setUser(null);
  window.addEventListener('pgfy:logout',onLogout);
  if (localStorage.getItem(TOKEN_KEY)) api<{ user: User }>('/api/auth/me').then(data => { if(active) setUser(data.user); }).catch(() => { if(active) logout(); }).finally(() => { if(active) setLoading(false); });
  else setLoading(false);
  return () => { active=false; window.removeEventListener('pgfy:logout',onLogout); };
 },[]);
 const login = async (email: string,password: string) => { const data = await api<{ token: string; user: User }>('/api/auth/login',{method:'POST',body:{email,password}}); localStorage.setItem(TOKEN_KEY,data.token); setUser(data.user); };
 return <AuthContext.Provider value={{user,loading,login,logout}}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value=useContext(AuthContext); if(!value) throw new Error('AuthProvider missing'); return value; }
