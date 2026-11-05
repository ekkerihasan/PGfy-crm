import { useEffect, useId, useLayoutEffect, useRef, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { label } from '../../lib/format';
export function Button({ variant='primary', className='', type='button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {variant?: 'primary'|'secondary'|'danger'|'ghost'}) { return <button type={type} className={`button button-${variant} ${className}`} {...props}/>; }
export function Input({className='',...props}:InputHTMLAttributes<HTMLInputElement>) { return <input className={`input ${className}`} {...props}/>; }
export function Select({className='',...props}:SelectHTMLAttributes<HTMLSelectElement>) { return <select className={`input ${className}`} {...props}/>; }
export function Textarea({className='',...props}:TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea className={`input ${className}`} rows={3} {...props}/>; }
export function Field({label: text,children}:{label:string;children:ReactNode}) { return <label className="field"><span>{text}</span>{children}</label>; }
export function Card({children,className=''}:{children:ReactNode;className?:string}) { return <section className={`card ${className}`}>{children}</section>; }
/** On phones (see styles.css) each row becomes a card; every cell shows its column name, taken from the table header. */
export function Table({children}:{children:ReactNode}) {
 const ref=useRef<HTMLTableElement>(null);
 useLayoutEffect(()=>{
  const table=ref.current; if(!table) return;
  const headers=[...table.querySelectorAll('thead th')].map(th=>th.textContent?.trim()??'');
  table.querySelectorAll('tbody tr').forEach(row=>[...row.children].forEach((cell,i)=>cell.setAttribute('data-label',headers[i]??'')));
 });
 return <div className="table-scroll"><table ref={ref}>{children}</table></div>;
}
export function Badge({children,value}:{children?:ReactNode;value?:string}) { const text=value || (typeof children==='string'?children:''); return <span className={`badge badge-${text.toLowerCase().replace(/_/g,'-')}`}>{value?label(value):children}</span>; }
export function Loading() { return <div className="state" role="status"><span className="loading-dot"/>Loading…</div>; }
export function ErrorState({message,onRetry}:{message:string;onRetry?:()=>void}) { return <div className="error-state" role="alert"><p>{message}</p>{onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}</div>; }
export function EmptyState({message}:{message:string}) { return <div className="state">{message}</div>; }
export function PageHeader({title,description,action}:{title:string;description?:string;action?:ReactNode}) { return <div className="page-heading"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>; }
export function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}) {
 const ref=useRef<HTMLDialogElement>(null); const titleId=useId();
 useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close();},[]);
 return <dialog ref={ref} className="modal" aria-labelledby={titleId} onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget)onClose();}}><div className="modal-inner"><div className="modal-heading"><h2 id={titleId}>{title}</h2><Button variant="ghost" onClick={onClose} aria-label="Close dialog"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></Button></div>{children}</div></dialog>;
}

