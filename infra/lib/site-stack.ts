import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import type { Construct } from 'constructs';

export interface SiteStackProps extends StackProps {
  /** Absolute path to the built site (the Vite `dist/` folder). */
  siteDir: string;
  /** The bare domain the front page is served on; www. redirects to it. */
  domainName: string;
  zone: route53.IHostedZone;
}

/**
 * Static hosting: a private S3 bucket that only CloudFront can read
 * (Origin Access Control), served over HTTPS from CloudFront's edge,
 * on the bare domain and www.
 */
export class SiteStack extends Stack {
  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, props);

    const { domainName, zone } = props;
    const wwwName = `www.${domainName}`;

    const bucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      // The site is rebuilt from source on every deploy, so nothing in the bucket needs keeping.
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront only takes certificates from us-east-1, which is where this stack lives.
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName,
      subjectAlternativeNames: [wwwName],
      validation: acm.CertificateValidation.fromDns(zone),
    });

    // One address for the site: www.moving-parts.dev/… → moving-parts.dev/…
    const redirectWww = new cloudfront.Function(this, 'RedirectWww', {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      comment: `Redirect ${wwwName} to ${domainName}`,
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  if (request.headers.host.value === '${wwwName}') {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: 'https://${domainName}' + request.uri } },
    };
  }
  return request;
}`),
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: 'Moving Parts: front page',
      domainNames: [domainName, wwwName],
      certificate,
      defaultRootObject: 'index.html',
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        compress: true,
        functionAssociations: [{ function: redirectWww, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST }],
      },
      // The site is a single page, so any other path is a typo: show the front page
      // instead of S3's raw "AccessDenied" XML, but keep the 404 status.
      errorResponses: [403, 404].map((httpStatus) => ({
        httpStatus,
        responseHttpStatus: 404,
        responsePagePath: '/index.html',
        ttl: Duration.minutes(1),
      })),
    });

    const target = route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution));
    for (const [id, recordName] of [['Apex', domainName], ['Www', wwwName]]) {
      new route53.ARecord(this, `${id}A`, { zone, recordName, target });
      new route53.AaaaRecord(this, `${id}Aaaa`, { zone, recordName, target });
    }

    // Vite's hashed files never change once published, so browsers may cache them for a year.
    const assets = new s3deploy.BucketDeployment(this, 'DeployAssets', {
      sources: [s3deploy.Source.asset(props.siteDir)],
      destinationBucket: bucket,
      exclude: ['*'],
      include: ['assets/*'],
      cacheControl: [s3deploy.CacheControl.fromString('public, max-age=31536000, immutable')],
    });

    // Everything else (index.html, favicon) must be revalidated, so a deploy shows up immediately.
    const root = new s3deploy.BucketDeployment(this, 'DeployRoot', {
      sources: [s3deploy.Source.asset(props.siteDir)],
      destinationBucket: bucket,
      exclude: ['assets/*'],
      cacheControl: [s3deploy.CacheControl.fromString('no-cache')],
      distribution,
      distributionPaths: ['/*'],
    });
    // Upload the new assets before the index.html that references them.
    root.node.addDependency(assets);

    new CfnOutput(this, 'SiteUrl', { value: `https://${domainName}` });
    new CfnOutput(this, 'CloudFrontUrl', { value: `https://${distribution.distributionDomainName}` });
    new CfnOutput(this, 'DistributionId', { value: distribution.distributionId });
    new CfnOutput(this, 'BucketName', { value: bucket.bucketName });
  }
}
