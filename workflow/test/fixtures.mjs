import { readFileSync } from 'node:fs';
export function fixture() {
  // Synthetic integration-test inputs only. These are not reviewed county rules.
  const candidate = JSON.parse(readFileSync(new URL('../../taxappeal-qualify/data/candidates.sample.json',import.meta.url),'utf8'))[0];
  const config = JSON.parse(readFileSync(new URL('../../taxappeal-qualify/config/desk.placeholder.json',import.meta.url),'utf8'));
  const today = new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const year=Number(today.slice(0,4));
  candidate.jurisdictionId='FL-Lee';candidate.provenance.fetchedAt=today;candidate.provenance.sources={roll:'https://www.leepa.org/'};
  candidate.assessment.valuationDate=`${year}-01-01`;
  for(const comp of candidate.comps)comp.saleDate=`${year-1}-10-01`;
  config.version='integration-fixture';config.jurisdiction.id='FL-Lee';config.jurisdiction.name='Lee County integration fixture';config.jurisdiction.valuationDate=candidate.assessment.valuationDate;config.compRules.saleWindowAfterDays=0;
  config.llm.enabled=false;config.routes[0].opens=`${year}-01-01`;config.routes[0].closes=`${year+1}-12-31`;
  return {candidate,config,rules:{reviewedBy:'Integration test operator',reviewedOn:today,sources:['https://www.leepa.org/']},evidence:{justValue:candidate.assessment.assessedValue,countyLevel:1,generatePdf:false}};
}
export const authorization = {signer:'Test fixture signer',reviewed:true,contentBase64:Buffer.from('%PDF-1.4\nSynthetic authorization fixture; no real signature.\n%%EOF').toString('base64')};
