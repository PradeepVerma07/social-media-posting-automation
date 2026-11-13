import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveNavigation,navigationPath,navigationTitle} from '../../src/utils/navigation';

test('clean studio and workflow paths resolve without overlapping account or automation names',()=>{
  assert.equal(resolveNavigation({pathname:'/automation-studio'}),'ai-studio');
  assert.equal(resolveNavigation({pathname:'/social-media-desk'}),'social-desk');
  assert.equal(resolveNavigation({pathname:'/creator-studio'}),'creator');
  assert.equal(resolveNavigation({pathname:'/creator-approvals'}),'video-approvals');
  assert.equal(resolveNavigation({pathname:'/automations'}),'automations');
  assert.equal(resolveNavigation({pathname:'/social-accounts'}),'accounts');
  assert.equal(navigationPath('ai-studio'),'/automation-studio');
  assert.equal(navigationTitle('ai-studio'),'Automation Studio | Webtrionix 360');
});
test('legacy hash bookmarks preserve their destination and resolve to clean paths',()=>{
  for(const hash of ['#/ai-studio','#/studio','#neural'])assert.equal(navigationPath(resolveNavigation({pathname:'/',hash})!),'/automation-studio');
  assert.equal(resolveNavigation({pathname:'/automation-studio',hash:'#/creator'}),'creator');
  assert.equal(resolveNavigation({pathname:'/',hash:'#/social-desk'}),'social-desk');
  assert.equal(resolveNavigation({pathname:'/',hash:'#/video-approvals'}),'video-approvals');
  assert.equal(resolveNavigation({pathname:'/',hash:'#/accounts'}),'accounts');
});
test('root and explicit URLs take precedence over old local navigation state',()=>{
  assert.equal(resolveNavigation({pathname:'/'}),'overview');
  assert.equal(resolveNavigation({pathname:'/content-calendar/'}),'calendar');
  assert.equal(resolveNavigation({pathname:'/ai-studio'}),'ai-studio');
  assert.equal(resolveNavigation({pathname:'/',search:'?page=register'}),'register');
  assert.equal(resolveNavigation({pathname:'/',search:'?onboard=true'}),'register');
});
test('unrecognised, malformed and nested paths are not interpreted as dashboard pages',()=>{
  for(const pathname of ['/api/v1/posts','/internal/publish','/assets/not-a-page.js','/automation-studio/admin','/social-account-secrets','/%not-valid'])assert.equal(resolveNavigation({pathname}),null,pathname);
  assert.equal(resolveNavigation({pathname:'/',search:'?q=register'}),'overview');
});
