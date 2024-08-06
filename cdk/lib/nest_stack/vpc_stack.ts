

import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';

import { Construct } from 'constructs';

export class VPCStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly ecs_sg: ec2.SecurityGroup;
  public readonly alb_sg: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'LocustVPC', {
      ipAddresses: ec2.IpAddresses.cidr('192.168.0.0/16'),
      maxAzs: 2,
      natGateways: 2,
    });

    const ecs_sg = new ec2.SecurityGroup(this, 'LocustECSSecurityGroup', {
      vpc,
      allowAllOutbound: true,
    });
    ecs_sg.addIngressRule(
      ecs_sg,
      ec2.Port.allTraffic(),
      'Allow all traffic from the same security group'
    );

    const alb_sg = new ec2.SecurityGroup(this, 'LocustALBSecurityGroup', {
      vpc,
      allowAllOutbound: true,
    });

    this.vpc = vpc;
    this.ecs_sg = ecs_sg;
    this.alb_sg = alb_sg;

  }
}
