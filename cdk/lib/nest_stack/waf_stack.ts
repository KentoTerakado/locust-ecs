import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_wafv2 as wafv2 } from 'aws-cdk-lib';

export class WafStack extends cdk.Stack {
  public readonly wafacl: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Web ACL を作成
    const wafacl = new wafv2.CfnWebACL(this, 'LocustBasicAuthWaf', {
      name: 'LocustWafAcl',
      defaultAction: {
        allow: {}
      },
      scope: 'REGIONAL',
      visibilityConfig: {
        cloudWatchMetricsEnabled: false,
        metricName: 'LocustWafAcl',
        sampledRequestsEnabled: false,
      },
      rules: [
        {
          name: 'BasicAuthRule',
          priority: 1,
          statement: {
            notStatement: {
              statement: {
                byteMatchStatement: {
                  searchString: 'Basic ' + cdk.Fn.base64('locust:locust'),
                  fieldToMatch: {
                    singleHeader: {
                      name: 'authorization'
                    }
                  },
                  textTransformations: [
                    {
                      priority: 0,
                      type: 'NONE'
                    }
                  ],
                  positionalConstraint: 'EXACTLY'
                }
              }
            }
          },          
          action: { 
            block: {
              customResponse: {
                responseCode: 401,
                responseHeaders: [{ name: 'www-authenticate', value: 'Basic' }],
              }
          }},
          visibilityConfig: {
            cloudWatchMetricsEnabled: false,
            metricName: 'BasicAuthRule',
            sampledRequestsEnabled: false,
          },
        }, 
      ],
    });
    this.wafacl = wafacl;
  }
}
