export function createSingleFlight(){
  let running:Promise<void>|null=null;
  return (work:()=>Promise<void>):Promise<void>=>{
    if(running)return running;
    const task=Promise.resolve().then(work);running=task;
    void task.finally(()=>{if(running===task)running=null;}).catch(()=>{});
    return task;
  };
}
export function stableUser<T extends {id:number}>(previous:T,next:T):T {
  const keys=['id','email','fullName','role','clientId','avatarUrl','tenantScope','isActive'];
  return keys.every(key=>(previous as any)[key]===(next as any)[key])?previous:next;
}
