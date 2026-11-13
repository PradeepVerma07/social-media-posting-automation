export class ApiError extends Error {
  constructor(message:string,public status:number,public code:string,public requestId?:string){super(message);this.name='ApiError';}
}
export function createApiRequester({fetcher=globalThis.fetch.bind(globalThis),now=Date.now,timeoutMs=20000,blockMs=30000,onSessionExpired=()=>{}}:{fetcher?:typeof fetch;now?:()=>number;timeoutMs?:number;blockMs?:number;onSessionExpired?:()=>void}={}) {
  const pending=new Map<string,Promise<any>>();let blockedUntil=0;
  return function request<T>(endpoint:string,options:RequestInit={}):Promise<T>{
    const method=(options.method||'GET').toUpperCase(),headers=new Headers(options.headers);
    if(options.body&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
    const key=method+endpoint+JSON.stringify(Array.from(headers.entries()));
    if(method==='GET'&&!options.signal&&pending.has(key))return pending.get(key)!;
    const work=(async()=>{
      if(now()<blockedUntil)throw new ApiError('Hosting is temporarily blocking dashboard requests. Wait 30 seconds, then refresh. Your changes have not been sent.',403,'HOSTING_BLOCKED');
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
      const signal=options.signal?AbortSignal.any([options.signal,controller.signal]):controller.signal;
      try{
        const response=await fetcher('/api/v1'+endpoint,{...options,method,headers,credentials:'same-origin',signal});
        const json=response.headers.get('content-type')?.toLowerCase().includes('json');
        if(!json){
          if(response.status===403){blockedUntil=now()+blockMs;throw new ApiError('Hosting blocked this request before it reached the dashboard. Wait 30 seconds and refresh; contact the administrator if it continues.',403,'HOSTING_BLOCKED',response.headers.get('x-hcdn-request-id')||undefined);}
          throw new ApiError('The server returned a page instead of dashboard data. Refresh after the connection recovers.',response.status,'INVALID_RESPONSE');
        }
        const data=await response.json().catch(()=>null);
        if(!response.ok){
          if(response.status===401&&endpoint!=='/auth/login')onSessionExpired();
          const detail=data?.error;
          throw new ApiError(typeof detail==='string'?detail:detail?.message||data?.message||`Request failed (HTTP ${response.status}).`,response.status,'API_ERROR');
        }
        if(data===null)throw new ApiError('The server returned incomplete dashboard data. Please refresh.',response.status,'INVALID_RESPONSE');
        blockedUntil=0;return data as T;
      }catch(error:any){
        if(error instanceof ApiError)throw error;
        if(controller.signal.aborted)throw new ApiError('The request timed out. Check the connection and try again.',0,'TIMEOUT');
        if(error.name==='AbortError')throw error;
        throw new ApiError('Connection error: the server is restarting or unreachable. Please try again shortly.',0,'NETWORK_ERROR');
      }finally{clearTimeout(timer);}
    })();
    if(method==='GET'&&!options.signal){pending.set(key,work);void work.finally(()=>{if(pending.get(key)===work)pending.delete(key);}).catch(()=>{});}
    return work;
  };
}
