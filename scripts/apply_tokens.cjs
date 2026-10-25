const fs = require('fs');

const oldToken = 'EAGVJejn6LZAgBS6WNRis8ZBAYNmc0RwStlk3jKnniciCU8XZCDUkE0EoY5sboubZCFkmVDZBPcHucnWUOsVnbWpH8Wbur8mqXyOfgw52c4op6skSjCDvkffZBnzTjF9sT5ohOjAz8W98Fl9lDQlZCpYlNZBArYRYf7opKIZC4DFcTXNl7meoehyRgwQuJ7Gen36O9NWoFYqfVmu3RCf4dOuUl1eK12DRjerpCWZA7WOdy9C1OjjNviBfK6Co1xOB4gTclZA8I0kxCceuUAftmZCbZBtxj5akGWAZDZD';
const userToken = 'EAGVJejn6LZAgBS8mrc3ZB41OBQywsjJS97CZC4yagW3qsd4JPFemxWiKLyjSOryb6L6x2HX7WI9ensmDgFGq0SE4ZBWMV3x29hESjH8nPhWoUZBUQpYdCvOILNTv3cX2zLCxFWLhKpKNFnRNaTpQb6q5gyqXPDgUiUTRtJxPYGQZCWj9VwlPEAUpeZBBQLXMTdhPXrHej4TJJtLcXG2TL35j61K0SyToKqhIoGQ';
const pageToken = 'EAGVJejn6LZAgBSwOKZCX0MFZBkKEHFPTwaUZBex4cC3odbX6WtOCXhAIxV6AE08FAGhnsQgflhWm8sBAP6k58zUoa07OFDCCO53CnfnEG4ZBk7gGf8Y0IKvnn4JOvQFSLJfBOyTgjitx8FshB4VaZBZBrN8GZCJLIZC4Ocnj1UVQqv6w474cO0VW0jy2Rd4Eso72mCUwOzsXsNt0YOZB8rik2fXc9Uw1utjmUoc5Eh4jYZD';

let raw = fs.readFileSync('workflows/main_scheduler.json', 'utf8');
raw = raw.split(oldToken).join(userToken);

const wf = JSON.parse(raw);

// 1. Update Facebook node to use pageToken fallback
const fbNode = wf.nodes.find(n => n.name === 'HTTP - Facebook Publish');
if (fbNode && fbNode.parameters && fbNode.parameters.headerParameters) {
  const auth = fbNode.parameters.headerParameters.parameters.find(p => p.name === 'Authorization');
  if (auth) {
    auth.value = "={{ 'Bearer ' + ($json.access_token || '" + pageToken + "') }}";
  }
}

// 2. Ensure Sheet - Lock Row (Processing) matchingColumns is set
const lockNode = wf.nodes.find(n => n.name === 'Sheet - Lock Row (Processing)');
if (lockNode) {
  lockNode.parameters.columns = lockNode.parameters.columns || {};
  lockNode.parameters.columns.matchingColumns = ['post_id'];
}

// 3. Ensure other update sheet nodes have matchingColumns
wf.nodes.forEach(n => {
  if (n.type === 'n8n-nodes-base.googleSheets' && n.parameters && n.parameters.operation === 'update') {
    n.parameters.columns = n.parameters.columns || {};
    if (!n.parameters.columns.matchingColumns || n.parameters.columns.matchingColumns.length === 0) {
      n.parameters.columns.matchingColumns = ['post_id'];
    }
  }
});

fs.writeFileSync('workflows/main_scheduler.json', JSON.stringify(wf, null, 2), 'utf8');
console.log('Successfully updated workflows/main_scheduler.json');

// Update .env
let env = '';
if (fs.existsSync('.env')) {
  env = fs.readFileSync('.env', 'utf8');
}
env += '\nMETA_ACCESS_TOKEN=' + userToken + '\nFACEBOOK_PAGE_ACCESS_TOKEN=' + pageToken + '\n';
fs.writeFileSync('.env', env, 'utf8');
console.log('Successfully updated .env');
