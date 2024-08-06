

import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { aws_ecs as ecs } from 'aws-cdk-lib';
import { aws_ecr as ecr } from 'aws-cdk-lib';
import { aws_logs as logs } from 'aws-cdk-lib';
import { aws_servicediscovery as servicediscovery } from 'aws-cdk-lib';

import { Construct } from 'constructs';

export class ECSClusterStack extends cdk.Stack {
  public readonly cluster: ecs.Cluster;
  public readonly logGroup: logs.LogGroup;
  public readonly repository: ecr.Repository
  public readonly namespace: servicediscovery.PrivateDnsNamespace;

  constructor(
    scope: Construct,
    id: string,
    props: cdk.StackProps,
    vpc: ec2.IVpc,
  ) {
    super(scope, id, props);

    const repository = new ecr.Repository(this, 'LocustECR', {
      repositoryName: 'locust',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const cluster = new ecs.Cluster(this, 'LocustECSCluster', {
      vpc: vpc,
      clusterName: 'locust',
      enableFargateCapacityProviders: true,
    });
    cluster.addDefaultCloudMapNamespace({
      name: 'locust.local',
    });
    
    const logGroup = new logs.LogGroup(this, 'LocustLogGroup', {
      logGroupName: '/ecs/locust',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_WEEK
    });

    this.cluster = cluster;
    this.logGroup = logGroup;
    this.repository = repository;
    
  }
}
