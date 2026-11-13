import type {NavigationTab} from '../components/layout/Sidebar';

export const navigationRoutes:Record<NavigationTab,{path:string;title:string}>={
  overview:{path:'/',title:'Overview'},
  'instant-post':{path:'/instant-post',title:'Instant Brand Post'},
  'ai-studio':{path:'/automation-studio',title:'Automation Studio'},
  creator:{path:'/creator-studio',title:'Creator Studio'},
  'social-desk':{path:'/social-media-desk',title:'Social Media Desk'},
  content:{path:'/content',title:'Content Management'},
  calendar:{path:'/content-calendar',title:'Content Calendar'},
  create:{path:'/create-post',title:'Create Post'},
  approvals:{path:'/approvals',title:'Approval Queue'},
  'video-approvals':{path:'/creator-approvals',title:'Creator Approvals'},
  published:{path:'/published-posts',title:'Published Posts'},
  brands:{path:'/brands',title:'Brands'},
  accounts:{path:'/social-accounts',title:'Social Accounts'},
  automations:{path:'/automations',title:'Automations'},
  'n8n-login':{path:'/n8n-login',title:'n8n Login'},
  executions:{path:'/workflow-executions',title:'Workflow Executions'},
  analytics:{path:'/analytics',title:'Analytics & Reports'},
  sheets:{path:'/google-sheets',title:'Google Sheets Sync'},
  team:{path:'/team',title:'Team & Access'},
  audit:{path:'/audit-logs',title:'Audit Logs'},
  settings:{path:'/settings',title:'Settings'},
  register:{path:'/register',title:'Register Brand'},
};
const aliases:Record<string,NavigationTab>={
  instant:'instant-post','instant-post':'instant-post','direct-post':'instant-post',
  ai:'ai-studio',studio:'ai-studio',neural:'ai-studio',
  social:'accounts','social-accounts':'accounts',brand:'brands',
  workflow:'automations',workflows:'automations',canvas:'automations',
  execution:'executions',login:'n8n-login',n8n:'n8n-login',
  post:'content',posts:'content',compose:'create',approval:'approvals',queue:'approvals',
  report:'analytics',reports:'analytics',sheet:'sheets','google-sheets':'sheets',
  users:'team',rbac:'team',logs:'audit','audit-logs':'audit',setting:'settings',
  onboarding:'register',onboard:'register',join:'register',
};
function resolveSegment(value:string):NavigationTab|null {
  let segment:string;
  try{segment=decodeURIComponent(value).replace(/^\/+|\/+$/g,'').trim().toLowerCase();}catch{return null;}
  if(!segment)return 'overview';
  const match=Object.entries(navigationRoutes).find(([,route])=>route.path.slice(1)===segment);
  if(match)return match[0] as NavigationTab;
  if(Object.hasOwn(navigationRoutes,segment))return segment as NavigationTab;
  return Object.hasOwn(aliases,segment)?aliases[segment]:null;
}
export function resolveNavigation(location:{pathname:string;hash?:string;search?:string}):NavigationTab|null {
  const query=new URLSearchParams(location.search||'');
  if(['register','onboard','onboarding','join'].includes(query.get('page')||'')||query.has('register')||query.has('onboard'))return 'register';
  // Legacy bookmarks retain their meaning even when opened from a clean path.
  if(location.hash){const legacy=resolveSegment(location.hash.replace(/^#/,'').split('?')[0]);if(legacy)return legacy;}
  return resolveSegment(location.pathname);
}
export const navigationPath=(tab:NavigationTab)=>navigationRoutes[tab].path;
export const navigationTitle=(tab:NavigationTab)=>`${navigationRoutes[tab].title} | Webtrionix 360`;
