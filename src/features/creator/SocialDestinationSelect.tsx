import React,{useEffect,useId,useRef,useState} from 'react';
import {ChevronDown,Check} from 'lucide-react';

type Destination={id:string;name:string;platform:string};

export function SocialDestinationSelect({options,value,onChange,disabled=false}:{options:Destination[];value:string[];onChange:(ids:string[])=>void;disabled?:boolean}){
  const [open,setOpen]=useState(false),[above,setAbove]=useState(false);
  const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),id=useId();
  const selected=options.filter(option=>value.includes(option.id));
  const label=selected.length===1?`${selected[0].name} · ${selected[0].platform}`:selected.length>1?`${selected.length} destinations selected`:'Select social destinations';
  useEffect(()=>{if(!open)return;
    const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.stopPropagation();setOpen(false);trigger.current?.focus();}};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
  },[open]);
  useEffect(()=>{if(disabled)setOpen(false);},[disabled]);
  const toggle=()=>{if(!open){const bounds=trigger.current?.getBoundingClientRect();setAbove(!!bounds&&window.innerHeight-bounds.bottom<300&&bounds.top>300);}setOpen(current=>!current);};
  return <div ref={root} className="relative space-y-2" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setOpen(false);}}>
    <label htmlFor={id} className="block text-sm font-semibold text-slate-800">Social destinations</label>
    <button ref={trigger} id={id} type="button" disabled={disabled||!options.length} aria-expanded={open} aria-controls={`${id}-options`} aria-describedby={`${id}-help`} onClick={toggle} className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-left text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400">
      <span className="min-w-0 truncate">{options.length?label:'No connected destinations'}</span><ChevronDown size={17} className={`shrink-0 text-slate-500 transition-transform ${open?'rotate-180':''}`}/>
    </button>
    <p id={`${id}-help`} className="text-xs text-slate-500">Choose one or more connected accounts.</p>
    {open&&<div id={`${id}-options`} role="group" aria-label="Choose social destinations" className={`absolute inset-x-0 z-30 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ${above?'bottom-[calc(100%+8px)]':'top-full'}`}>
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2"><span className="text-xs font-medium text-slate-600">{selected.length} selected</span><div className="flex gap-3"><button type="button" onClick={()=>onChange(options.map(option=>option.id))} className="text-xs font-medium text-indigo-700">Select all</button><button type="button" onClick={()=>onChange([])} className="text-xs text-slate-500">Clear</button></div></div>
      <div className="max-h-56 overflow-y-auto overscroll-contain p-1.5">{options.map(option=><label key={option.id} className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50 ${value.includes(option.id)?'bg-indigo-50 text-indigo-900':'text-slate-700'}`}>
        <input type="checkbox" className="h-4 w-4 shrink-0 accent-indigo-600" checked={value.includes(option.id)} onChange={event=>onChange(event.target.checked?[...value.filter(id=>id!==option.id),option.id]:value.filter(id=>id!==option.id))}/>
        <span className="min-w-0 flex-1"><span className="block break-words font-medium">{option.name}</span><span className="block text-xs capitalize text-slate-500">{option.platform}</span></span>{value.includes(option.id)&&<Check size={15} className="shrink-0 text-indigo-600"/>}
      </label>)}</div>
      <div className="flex justify-end border-t border-slate-100 px-3 py-2"><button type="button" onClick={()=>{setOpen(false);trigger.current?.focus();}} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">Done</button></div>
    </div>}
  </div>;
}
