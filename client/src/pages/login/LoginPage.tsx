import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Button, Input, Field, ErrorState } from '../../components/ui';
import { errorMessage } from '../../lib/format';
export default function LoginPage() {
 const {user,login}=useAuth();const navigate=useNavigate();const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 if(user) return <Navigate to="/" replace/>;
 async function submit(event:FormEvent) { event.preventDefault();setBusy(true);setError('');try{await login(email,password);navigate('/',{replace:true});}catch(error){setError(errorMessage(error));}finally{setBusy(false);} }
 return <main className="login-shell"><section className="login-intro"><a className="brand" href="/">PG<span>fy</span><small>SALES CRM</small></a><div><p className="eyebrow">A better place to connect</p><h1>Every enquiry.<br/>A new opportunity.</h1><p>Keep your leads, conversations and follow-ups together. Build relationships that move business forward.</p></div><p className="login-foot">Your sales day, organised.</p></section><section className="login-panel"><form onSubmit={submit} className="login-form"><p className="eyebrow">WELCOME BACK</p><h2>Sign in to your workspace</h2><p className="muted">Enter your email and password to continue.</p>{error&&<ErrorState message={error}/>}<Field label="Email address"><Input autoComplete="username" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@pgfy.demo"/></Field><Field label="Password"><Input autoComplete="current-password" type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password"/></Field><Button type="submit" disabled={busy}>{busy?'Signing in…':'Sign in →'}</Button><div className="demo-hint"><strong>Demo accounts</strong><p>admin@pgfy.demo / Admin@123</p><p>sales@pgfy.demo / Sales@123</p></div></form></section></main>;
}
