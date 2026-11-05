import { useEffect, useRef, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { label } from '../../lib/format';
export function Button({ variant='primary', className='', type='button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {variant?: 'primary'|'secondary'|'danger'|'ghost'}) { return <button type={type} className={`button button-${variant} ${className}`} {...props}/>; }
export function Input({className='',...props}:InputHTMLAttributes<HTMLInputElement>) { return <input className={`input ${className}`} {...props}/>; }
export function Select({className='',...props}:SelectHTMLAttributes<HTMLSelectElement>) { return <select className={`input ${className}`} {...props}/>; }
export function Textarea({className='',...props}:TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea className={`input ${className}`} rows={3} {...props}/>; }
export function Field({label: text,children}:{label:string;children:ReactNode}) { return <label className="field"><span>{text}</span>{children}</label>; }
export function Card({children,className=''}:{children:ReactNode;className?:string}) { return <section className={`card ${className}`}>{children}</section>; }
export function Table({children}:{children:ReactNode}) { return <div className="table-scroll"><table>{children}</table></div>; }
export function Badge({children,value}:{children?:ReactNode;value?:string}) { const text=value || (typeof children==='string'?children:''); return <span className={`badge badge-${text.toLowerCase().replace(/_/g,'-')}`}>{value?label(value):children}</span>; }
export function Loading() { return <div className="state" role="status"><span className="loading-dot"/>Loading…</div>; }
export function ErrorState({message,onRetry}:{message:string;onRetry?:()=>void}) { return <div className="error-state" role="alert"><p>{message}</p>{onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}</div>; }
export function EmptyState({message}:{message:string}) { return <div className="state">{message}</div>; }
export function PageHeader({title,description,action}:{title:string;description?:string;action?:ReactNode}) { return <div className="page-heading"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>; }
export function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}) {
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close();},[]);
 return <dialog ref={ref} className="modal" onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget)onClose();}}><div className="modal-inner"><div className="modal-heading"><h2>{title}</h2><Button variant="ghost" onClick={onClose} aria-label="Close dialog">✕</Button></div>{children}</div></dialog>;
}
