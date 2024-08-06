

import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { aws_ecs as ecs } from 'aws-cdk-lib';
import { aws_elasticloadbalancingv2 as elbv2 } from 'aws-cdk-lib';
import { aws_iam as iam } from 'aws-cdk-lib';
import { aws_logs as logs } from 'aws-cdk-lib';
import { aws_ecr as ecr } from 'aws-cdk-lib';
import { aws_servicediscovery as servicediscovery } from 'aws-cdk-lib';
import { aws_wafv2 as wafv2 } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class ECSServiceStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  public readonly ecs_sg: ec2.ISecurityGroup;
  public readonly alb_sg: ec2.ISecurityGroup;

  constructor(
    scope: Construct,
    id: string,
    props: cdk.StackProps,
    inputs: {
      vpc: ec2.IVpc,
      cluster: ecs.ICluster,
      ecs_sg: ec2.ISecurityGroup,
      alb_sg: ec2.ISecurityGroup,
      taskRole: iam.IRole,
      executionRole: iam.IRole,
      logGroup: logs.LogGroup,
      repository: ecr.IRepository,
      namespace: servicediscovery.PrivateDnsNamespace;
      wafacl: wafv2.CfnWebACL
      type: string,
    }
  ) {
    super(scope, id, props);

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'LocustTaskDefinition' + inputs.type, {
      family: 'locust-ecs-task-' + inputs.type,
      memoryLimitMiB: 512,
      cpu: 256,
      taskRole: inputs.taskRole,
      executionRole: inputs.executionRole,
    });
    taskDefinition.addContainer('LocustContainer' + inputs.type, {
      containerName: inputs.type,
      image: ecs.ContainerImage.fromEcrRepository(inputs.repository, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        logGroup: inputs.logGroup,
        streamPrefix: inputs.type
      }),
      essential: true,
      environment: {
        LOCUST_MODE: inputs.type == 'master' ? 'master': 'worker',
        LOCUST_OPTS: inputs.type == 'master' ? "-f /locust/locustfile.py --master": "-f /locust/locustfile.py --worker --master-host=master.locust.local",
        LOCUST_COMMAND: "/usr/local/bin/locust",
        SLAVE_HOST: 'slave',
      },
      portMappings: inputs.type === 'master' ? [
        {
          name: 'web',
          containerPort: 8089,
          hostPort: 8089,
        },
      ]: [],
      command: ["/bin/sh", "-c", "$LOCUST_COMMAND $LOCUST_OPTS"],
      
      readonlyRootFilesystem: true,
    });
    
    const subnets = inputs.vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS });
    const ecsService = new ecs.FargateService(this, 'LocustECSService' + inputs.type, {
      serviceName: 'locust-' + inputs.type,
      cluster: inputs.cluster,
      taskDefinition: taskDefinition,
      desiredCount: 0, // inputs.type === 'master' ? 1 : 2,
      securityGroups: [inputs.ecs_sg],
      vpcSubnets: { subnets: subnets.subnets },
      enableExecuteCommand: true,
      capacityProviderStrategies: [
        {
          capacityProvider: 'FARGATE_SPOT',
          weight: 1,
        },
      ],
      cloudMapOptions: {
        name: inputs.type,
        dnsTtl: cdk.Duration.seconds(10),
        failureThreshold: 2,
      },
    });

    if ( inputs.type === 'master' ) {
      this.CreateALB(inputs.vpc, ecsService, inputs.alb_sg, inputs.wafacl);
    }
    if ( inputs.type == 'slave' ) {
      this.ScalingPolicy(ecsService);
    }
  }

  private CreateALB(vpc: ec2.IVpc, ecsService: ecs.FargateService, alb_sg: ec2.ISecurityGroup, wafacl: wafv2.CfnWebACL) {
    const alb = new elbv2.ApplicationLoadBalancer(this, 'LocustALB', {
      vpc,
      internetFacing: true,
      securityGroup: alb_sg,
    });

    new wafv2.CfnWebACLAssociation(this, 'WafAssociation', {
      resourceArn: alb.loadBalancerArn,
      webAclArn: wafacl.attrArn,
    });

    const listener = alb.addListener('HttpListener', {
      port: 80,
    });

    listener.addTargets('ListenerRuleForECSService', {
      port: 8089,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [ecsService],
      healthCheck: {
        path: '/',
        interval: cdk.Duration.seconds(60),
      },
    });
  }

  private ScalingPolicy(ecsService: ecs.FargateService) {
    const autoScale = ecsService.autoScaleTaskCount({
      minCapacity: 0,
      maxCapacity: 0,
    });
    autoScale.scaleOnCpuUtilization('CpuUtilizationScalingPolicy', {
      targetUtilizationPercent: 50,
      scaleInCooldown: Duration.seconds(10),
      scaleOutCooldown: Duration.seconds(10)
    });
  }

}
