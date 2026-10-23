import { CfnOutput, Duration, Fn, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import type { Construct } from 'constructs';

export interface DnsStackProps extends StackProps {
  zoneName: string;
  /**
   * TXT values for the bare domain, such as the `google-site-verification=…` token
   * that proves to Google Search Console that this domain is ours.
   */
  txtValues?: string[];
}

/**
 * The Route 53 hosted zone for the whole domain. The front page and every
 * explainer put their records here (the explainers find it by name).
 *
 * It lives in its own stack, and is kept even if the stack is deleted, because
 * the registrar (Porkbun) points at its nameservers: a new zone would get new
 * ones, and the site would go dark until they were changed there too.
 */
export class DnsStack extends Stack {
  readonly zone: route53.IHostedZone;

  constructor(scope: Construct, id: string, props: DnsStackProps) {
    super(scope, id, props);

    const zone = new route53.PublicHostedZone(this, 'Zone', {
      zoneName: props.zoneName,
      comment: 'Moving Parts: front page and explainers',
    });
    zone.applyRemovalPolicy(RemovalPolicy.RETAIN);
    this.zone = zone;

    // All TXT values for a name must live in one record set.
    if (props.txtValues?.length) {
      new route53.TxtRecord(this, 'ApexTxt', { zone, values: props.txtValues, ttl: Duration.hours(1) });
    }

    new CfnOutput(this, 'HostedZoneId', { value: zone.hostedZoneId });
    new CfnOutput(this, 'NameServers', {
      value: Fn.join(' ', zone.hostedZoneNameServers ?? []),
      description: 'Set these as the nameservers for the domain at the registrar',
    });
  }
}
