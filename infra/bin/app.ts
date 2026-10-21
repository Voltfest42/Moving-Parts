import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { App, Tags } from 'aws-cdk-lib';
import { DnsStack } from '../lib/dns-stack.ts';
import { SiteStack } from '../lib/site-stack.ts';

const DOMAIN = 'moving-parts.dev';

const siteDir = fileURLToPath(new URL('../../dist', import.meta.url));
if (!existsSync(`${siteDir}/index.html`)) {
  throw new Error(`No built site at ${siteDir}. Run "npm run build" in the project root first.`);
}

const app = new App();
// Account and region come from the active AWS CLI profile. The region must be
// us-east-1: CloudFront only accepts certificates from there.
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION };

const dns = new DnsStack(app, 'MovingPartsDns', {
  zoneName: DOMAIN,
  env,
  description: 'Moving Parts: Route 53 hosted zone for moving-parts.dev',
});

const site = new SiteStack(app, 'MovingPartsSite', {
  siteDir,
  domainName: DOMAIN,
  zone: dns.zone,
  env,
  description: 'Moving Parts: front page on S3 + CloudFront',
});

for (const stack of [dns, site]) Tags.of(stack).add('project', 'moving-parts');
