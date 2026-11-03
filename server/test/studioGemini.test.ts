import test from 'node:test';
import assert from 'node:assert/strict';
import { generateStudio, studioInput, StudioError } from '../src/services/ai/studioGemini';

const input = studioInput.parse({brandId:'BR-test',task:'write',prompt:'Write a friendly caption for a new local bakery opening.'});
const result = {title:'Welcome to the bakery',caption:'Fresh bread and a warm welcome await.',hashtags:['#LocalBakery'],suggestions:['Add the verified opening date.'],checks:['Confirm the address before publishing.']};
test('Gemini Studio forwards the requested brand and validates actual structured output',async()=>{
  let request:any;
  const response = await generateStudio(input,'Example Bakery',async args=>{request=args;return {text:JSON.stringify(result),usageMetadata:{promptTokenCount:85,candidatesTokenCount:42}} as any;});
  assert.equal(request.model,process.env.GEMINI_TEXT_MODEL||'gemini-flash-latest');
  assert.equal(request.config.responseMimeType,'application/json');
  assert.match(JSON.stringify(request.contents),/Example Bakery/);
  assert.deepEqual(response.text,result);
  assert.deepEqual(response.usage,{inputTokens:85,outputTokens:42});
});
test('Gemini Studio never substitutes fake results after a provider failure',async()=>{
  await assert.rejects(generateStudio(input,'Example',async()=>{throw {status:429,message:'private-provider-details'};}),error=>error instanceof StudioError&&error.status===429&&!error.message.includes('private-provider-details'));
  await assert.rejects(generateStudio(input,'Example',async()=>({text:'not JSON'}) as any),error=>error instanceof StudioError&&error.code==='INVALID_OUTPUT');
  await assert.rejects(generateStudio(input,'Example',async()=>({text:JSON.stringify({title:'Incomplete'})}) as any),error=>error instanceof StudioError&&error.code==='INVALID_OUTPUT');
});
test('Gemini Studio requires credentials and never reports estimated tokens as measured',async()=>{
  const previous=process.env.GEMINI_API_KEY;const previousGoogle=process.env.GOOGLE_API_KEY;
  delete process.env.GEMINI_API_KEY;delete process.env.GOOGLE_API_KEY;
  try{await assert.rejects(generateStudio(input,'Example'),error=>error instanceof StudioError&&error.code==='GEMINI_NOT_CONFIGURED');}
  finally{if(previous!==undefined)process.env.GEMINI_API_KEY=previous;if(previousGoogle!==undefined)process.env.GOOGLE_API_KEY=previousGoogle;}
  const response=await generateStudio(input,'Example',async()=>({text:JSON.stringify(result)}) as any);
  assert.deepEqual(response.usage,{inputTokens:null,outputTokens:null});
});
test('Gemini image edits forward image bytes and accept only an actual image result',async()=>{
  const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lGQAAAAASUVORK5CYII=';
  const edit=studioInput.parse({...input,task:'image',sourceImage:{mimeType:'image/png',data:png},aspectRatio:'9:16'});
  let request:any;
  const generated=await generateStudio(edit,'Example',async args=>{request=args;return {candidates:[{content:{parts:[{inlineData:{mimeType:'image/png',data:png}}]}}]} as any;});
  assert.equal(request.contents[0].parts[1].inlineData.data,png);
  assert.equal(request.config.imageConfig.aspectRatio,'9:16');
  assert.equal(generated.image?.bytes.toString('base64'),png);
  await assert.rejects(generateStudio(edit,'Example',async()=>({text:'Could not generate.'}) as any),error=>error instanceof StudioError&&error.code==='NO_IMAGE');
  await assert.rejects(generateStudio({...edit,sourceImage:{mimeType:'image/png',data:Buffer.from('<html>not an image</html>').toString('base64')}},'Example',async()=>{throw new Error('Must never call provider');}),error=>error instanceof StudioError&&error.code==='INVALID_IMAGE');
});
