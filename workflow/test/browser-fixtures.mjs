// Creates isolated browser-test inputs. Never import these into the real workbench.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fixture, authorization } from './fixtures.mjs';
const directory=process.argv[2];
if(!directory?.startsWith('/private/tmp/claimos-workflow-browser.'))throw new Error('Use an isolated browser-test directory.');
const input=fixture();
writeFileSync(join(directory,'candidate.json'),JSON.stringify({...input.candidate,evidence:input.evidence}));
writeFileSync(join(directory,'config.json'),JSON.stringify(input.config));
writeFileSync(join(directory,'authorization.pdf'),Buffer.from(authorization.contentBase64,'base64'));
writeFileSync(join(directory,'metadata.json'),JSON.stringify({reviewedOn:input.rules.reviewedOn,justValue:input.evidence.justValue}));
