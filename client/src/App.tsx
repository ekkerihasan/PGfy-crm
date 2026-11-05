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
function Layout() {
 const {user,logout}=useAuth();const location=useLocation();
 const links=[['/','◫','Dashboard'],['/leads','♧','Leads'],['/follow-ups','◷','Follow-ups'],['/calls','↗','Call history'],...(user?.role==='ADMIN'?[['/reports','▤','Reports']]:[])];
 const current=links.find(([path])=>path==='/'?location.pathname==='/':location.pathname.startsWith(path))?.[2]||'Workspace';
 return <div className="app-shell"><aside className="sidebar"><NavLink to="/" className="brand">PG<span>fy</span><small>SALES CRM</small></NavLink><div className="sidebar-caption">WORKSPACE</div><nav aria-label="Main navigation">{links.map(([path,icon,title])=><NavLink to={path} end={path==='/'} key={path} className={({isActive})=>`nav-link ${isActive?'active':''}`}><span className="nav-icon" aria-hidden="true">{icon}</span>{title}</NavLink>)}</nav><div className="sidebar-bottom"><div className="avatar">{user?.name.split(' ').map(s=>s[0]).slice(0,2).join('')}</div><div><strong>{user?.name}</strong><small>{label(user?.role||'')}</small></div><Button variant="ghost" onClick={logout} aria-label="Sign out" title="Sign out">↪</Button></div></aside><div className="workspace"><header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{current}</strong></div><div className="topbar-actions"><span className="workspace-tag">Bengaluru · Sales</span><Button className="mobile-signout" variant="ghost" onClick={logout}>Sign out</Button></div></header><main className="page-content"><Outlet/></main><footer className="app-footer">PGfy Sales CRM <span>Make every conversation count.</span></footer></div></div>;
}
export default function App() { return <BrowserRouter><AuthProvider><Routes><Route path="/login" element={<LoginPage/>}/><Route element={<Protected/>}><Route element={<Layout/>}><Route index element={<DashboardPage/>}/><Route path="leads" element={<LeadsPage/>}/><Route path="leads/:id" element={<LeadDetailPage/>}/><Route path="follow-ups" element={<FollowUpsPage/>}/><Route path="calls" element={<CallsPage/>}/><Route path="reports" element={<AdminOnly/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Route></Route></Routes></AuthProvider></BrowserRouter>; }

