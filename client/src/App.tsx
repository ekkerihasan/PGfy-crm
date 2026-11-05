import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { Button, Loading } from './components/ui';
import { label } from './lib/format';
import LoginPage from './pages/login/LoginPage';
import LeadsPage from './pages/leads/LeadsPage';
import LeadDetailPage from './pages/leads/LeadDetailPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import FollowUpsPage from './pages/follow-ups/FollowUpsPage';
import CallsPage from './pages/calls/CallsPage';
import ReportsPage from './pages/reports/ReportsPage';
function Protected() { const {user,loading}=useAuth();if(loading)return <Loading/>;return user?<Outlet/>:<Navigate to="/login" replace/>; }
function AdminOnly() { const {user}=useAuth();return user?.role==='ADMIN'?<ReportsPage/>:<Navigate to="/" replace/>; }
function NavigationIcon({name}:{name:string}) {
 const shapes:Record<string,React.ReactNode>={dashboard:<><rect x="3" y="3" width="7" height="7" rx="1.3"/><rect x="14" y="3" width="7" height="7" rx="1.3"/><rect x="3" y="14" width="7" height="7" rx="1.3"/><rect x="14" y="14" width="7" height="7" rx="1.3"/></>,leads:<><rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="9" r="2.5"/><path d="M8 17c0-4 8-4 8 0"/></>,followups:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m-13 5 2 2 5-5"/></>,calls:<path d="M8 3H5a2 2 0 0 0-2 2c0 9 7 16 16 16a2 2 0 0 0 2-2v-3l-5-2-2 3a14 14 0 0 1-7-7l3-2-2-5Z"/>,reports:<><path d="M14 3H5v18h14V8l-5-5Z"/><path d="M14 3v5h5M8 16v2m4-5v5m4-7v7"/></>,logout:<><path d="M9 4H4v16h5m6-12 4 4-4 4m-7-4h11"/></>};
 return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name]}</svg>;
}
function Layout() {
 const {user,logout}=useAuth();const location=useLocation();
 const links=[['/','dashboard','Dashboard'],['/leads','leads','Leads'],['/follow-ups','followups','Follow-ups'],['/calls','calls','Call history'],...(user?.role==='ADMIN'?[['/reports','reports','Reports']]:[])];
 const current=links.find(([path])=>path==='/'?location.pathname==='/':location.pathname.startsWith(path))?.[2]||'Workspace';
 return <div className="app-shell"><a className="skip-link" href="#main-content">Skip to content</a><aside className="sidebar"><NavLink to="/" className="brand">PG<span>fy</span><small>SALES CRM</small></NavLink><div className="sidebar-caption">YOUR WORKSPACE</div><nav aria-label="Main navigation">{links.map(([path,icon,title])=><NavLink to={path} end={path==='/'} key={path} className={({isActive})=>`nav-link ${isActive?'active':''}`}><span className="nav-icon"><NavigationIcon name={icon}/></span>{title}</NavLink>)}</nav><div className="sidebar-note"><span className="sidebar-note-dot"/>Every conversation counts.</div><div className="sidebar-bottom"><div className="avatar">{user?.name.split(' ').map(s=>s[0]).slice(0,2).join('')}</div><div className="user-summary"><strong>{user?.name}</strong><small>{label(user?.role||'')}</small></div><Button variant="ghost" onClick={logout} aria-label="Sign out" title="Sign out"><NavigationIcon name="logout"/></Button></div></aside><div className="workspace"><header className="topbar"><NavLink to="/" className="brand topbar-brand" aria-label="PGfy home">PG<span>fy</span></NavLink><div className="breadcrumb">Workspace <span>/</span> <strong>{current}</strong></div><div className="topbar-actions"><span className="workspace-tag"><span/>Bengaluru · Sales</span><Button className="mobile-signout" variant="ghost" onClick={logout}>Sign out</Button></div></header><main id="main-content" className="page-content"><Outlet/></main><footer className="app-footer">PGfy Sales CRM <span>Your relationships. Your momentum.</span></footer></div></div>;
}
export default function App() { return <BrowserRouter><AuthProvider><Routes><Route path="/login" element={<LoginPage/>}/><Route element={<Protected/>}><Route element={<Layout/>}><Route index element={<DashboardPage/>}/><Route path="leads" element={<LeadsPage/>}/><Route path="leads/:id" element={<LeadDetailPage/>}/><Route path="follow-ups" element={<FollowUpsPage/>}/><Route path="calls" element={<CallsPage/>}/><Route path="reports" element={<AdminOnly/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Route></Route></Routes></AuthProvider></BrowserRouter>; }
